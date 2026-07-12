# ExWHYZ-Timeline ハイライト分類 `release` 追加 変更提案書（v3.50）

## 📋 変更要件の整理

### v3.50 での変更要件

1. **新機能**: ハイライトの分類に `release`（リリース）を追加する
2. **バグ修正**: `highlights.json` に `type: "release"` が 10 件含まれているが、型定義に未追加のためランタイムエラーの可能性がある

---

## 1. 現状（v3.49）と問題の詳細

### 現状

`highlights.json` に `type: "release"` のエントリが 10 件存在する：

| id | title | date |
|----|-------|------|
| `evt_A05` | ラストアルバム3rdアルバム「zION」リリース | 2026-08-26 |
| `evt_375` | 3rdシングル「GIVE YOU MY WORD」リリース | 2026-04-01 |
| `evt_347` | 2ndシングル「DON'T CRY / リグレット」リリース | 2025-12-10 |
| `evt_312` | 1stシングル「iD」リリース | 2025-07-30 |
| `evt_202` | EP「Sweet & Sour」リリース | 2024-07-31 |
| `evt_158` | アルバム「Dress to Kill」リリース | 2024-03-20 |
| `evt_120` | 1st EP「HOW HIGH?」リリース | 2023-10-18 |
| `evt_058` | 2ndアルバム「xANADU」リリース | 2023-04-19 |
| `evt_041` | アルバム「xYZ［hYPER EDITION］」リリース | 2023-03-01 |
| `evt_019` | 1stアルバム「xYZ」リリース | 2022-11-02 |

しかし、現在の型定義は `'tour' | 'live' | 'announcement' | 'event'` で、`'release'` が含まれていない。

全エントリが `date` フィールドを持つため `formatDate(item.date!)` の `undefined` クラッシュは発生しないが、カラー・アイコン・ラベルが未定義のためフォールバック表示になり、また FilterBar に表示されない。

---

## 2. 変更詳細

### 2.1 型定義の拡張

3 つのコンポーネントで `HighlightItem.type` のユニオン型に `'release'` を追加する。

```typescript
// 変更前
type: 'tour' | 'live' | 'announcement' | 'event';

// 変更後
type: 'tour' | 'live' | 'announcement' | 'event' | 'release';
```

### 2.2 `release` タイプのスタイル

| 項目 | 値 |
|------|-----|
| ラベル | `リリース` |
| アイコン | `💿` |
| バッジ色 | `bg-yellow-950/40 text-yellow-400/80 border-yellow-900/50` |
| ボーダー色 | `border-l-yellow-500/60` |

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.50.md` | **新規** | 本変更提案書 |
| `components/Highlights/HighlightCard.tsx` | **修正** | `'release'` 型追加、色/アイコン/ラベル追加 |
| `components/Highlights/HighlightsContainer.tsx` | **修正** | `'release'` 型追加 |
| `components/Highlights/FilterBar.tsx` | **修正** | `HighlightType` と `TYPE_CONFIG` に `'release'` 追加 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| `highlights.json` | ✅ 変更なし | `release` エントリ 10 件既存 |
| `YearSection` | ✅ 変更なし | |
| `page.tsx` | ✅ 変更なし | |
| タイムライン画面 | ✅ 変更なし | |