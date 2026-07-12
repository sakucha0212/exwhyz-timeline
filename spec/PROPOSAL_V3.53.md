# ExWHYZ-Timeline ツイートデータ取得フローのバグ修正 変更提案書（v3.53）

## 📋 変更要件の整理

### v3.53 での変更要件

1. **バグ修正1**: 過去月の `forceRefresh` は無意味な全件 API 再取得になるためガードを追加
2. **バグ修正2**: 差分更新時の sinceId がないケースでログが「差分更新」と誤表示される問題を修正

---

## 1. 現状（v3.52）と問題の詳細

### バグ1: 過去月の forceRefresh は無意味な全件再取得

**場所**: `lib/data-provider-monthly.ts` L62-76

**内容**: 過去月で `forceRefresh=true` の場合、キャッシュチェックがスキップされ（`if (!forceRefresh)`）、当月でもないため `fetchFullMonth()` にフォールスルーする。過去月のデータは変化しないため無駄な API 呼び出しになる。

現在は UI 側で過去月の「🔄 更新」ボタンを非表示にしているため実害はないが、コード上の防御として不十分。

### バグ2: 差分更新のログが実際の動作と不一致

**場所**: `lib/data-provider-monthly.ts` L123

**内容**: `fetchAndMergeCurrentMonth()` 内で `sinceId` が null の場合、L127 で `fetchFullMonth()` にフォールバックするが、ログには既に「差分更新」と出力されている。

---

## 2. 変更詳細

### 2.1 過去月 forceRefresh ガード追加

```typescript
// 変更後（L70-73 の直前に挿入）
// ── 過去月の強制更新は無意味（データは変化しない） ─────────────────
if (!isCurrent && forceRefresh) {
  const cached = await getMonthlyCache(yearMonth);
  return cached?.tweets ?? [];
}
```

### 2.2 ログの修正

```typescript
// 変更前（L123）
console.log(`[data-provider-monthly] 差分更新: ${yearMonth} (sinceId: ${sinceId ?? 'なし'})`);

// 変更後
if (sinceId) {
  console.log(`[data-provider-monthly] 差分更新: ${yearMonth} (sinceId: ${sinceId})`);
} else {
  console.log(`[data-provider-monthly] 差分更新→全件フォールバック: ${yearMonth} (sinceId なし)`);
}
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.53.md` | **新規** | 本変更提案書 |
| `lib/data-provider-monthly.ts` | **修正** | 過去月 forceRefresh ガード追加、差分更新ログ修正 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| タイムライン表示 | ✅ 変更なし | |
| ハイライト表示 | ✅ 変更なし | |
| API 呼出回数 | ✅ 不要な呼出が削減 | |