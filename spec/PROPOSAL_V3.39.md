# ExWHYZ-Timeline MonthPagination 上部ナビゲーションレイアウト調整 変更要求書（v3.39）

## 📋 変更要件の整理

### v3.39での変更要件

1. **UI改善**: `MonthPagination` の上部ナビゲーションで、前月を左端、次月を右端、中央グループ（年月ドロップダウン・空日トグル・更新ボタン）をセンタリングする

---

## 1. 現状（v3.38）と問題の詳細

### 問題

上部ナビゲーションの次月ボタンが年月ドロップダウンの直後に左詰めで配置されており、下部ナビゲーションの `justify-between` レイアウトと一貫性がない。

```
現状:  [◀ 前月] [2026年▼] [7月▼] [次月 ▶]     空の日を非表示  読み込み中...  [更新]
        ← すべて左詰め →
```

```
下部:  [◀ 前月]              [ハイライトに戻る]              [次月 ▶]
        ← justify-between →
```

### 変更後

```
変更後: [◀ 前月]        [2026年▼] [7月▼]  空の日を非表示  読み込み中...  [更新]        [次月 ▶]
         ← 左端 →         ← 中央 (flex-1 justify-center) →          ← 右端 →
```

---

## 2. 変更詳細

### 2.1 `components/Timeline/MonthPagination.tsx`（修正）

コンテナを `justify-between` に変更し、中央グループを `flex-1 flex justify-center flex-wrap items-center gap-2` でラップする。

**変更前の構造（フラット）:**
```
<div flex flex-wrap gap-2>
  前月ボタン
  年 dropdown
  月 dropdown
  次月ボタン
  空日トグル
  ローディング
  更新ボタン
</div>
```

**変更後の構造（左・中央・右）:**
```
<div flex justify-between>
  前月ボタン（左）
  <div flex-1 flex justify-center flex-wrap gap-2>
    年 dropdown
    月 dropdown
    空日トグル
    ローディング
    更新ボタン
  </div>
  次月ボタン（右）
</div>
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.39.md` | **新規** | 本変更要求書 |
| `components/Timeline/MonthPagination.tsx` | **修正** | レイアウトを左・中央・右の3分割に変更 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| 下部ナビゲーション | ✅ 変更なし | `TimelineContainer.tsx` は変更なし |
| ハイライト画面 | ✅ 変更なし | |
| スマホ表示 | ✅ flex-wrap 折り返し | 中央グループ内で折り返す |