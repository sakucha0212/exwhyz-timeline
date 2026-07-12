# ExWHYZ-Timeline ハイライトカード年別アコーディオン表示 変更要求書（v3.40）

## 📋 変更要件の整理

### v3.40での変更要件

1. **UI改善**: ハイライトカードリストを年別にグループ化し、アコーディオン開閉可能にする

---

## 1. 現状（v3.39）と問題の詳細

### 問題

ハイライトカードがフラットに並んでおり、年の区切りがわからない。全36件のカードが混在している。

### 改善後

```
▼ 2026年 (15件)
  HighlightCard, HighlightCard, ...
▼ 2025年 (8件)
  HighlightCard, HighlightCard, ...
▼ 2024年 (6件)
  ...
▼ 2023年 (5件)
  ...
▼ 2022年 (2件)
  ...
```

---

## 2. 変更詳細

### 2.1 `components/Highlights/YearSection.tsx`（新規）

年ヘッダーとカードリストを持つアコーディオンコンポーネント。

```tsx
interface YearSectionProps {
  year: number;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}
```

| 項目 | 仕様 |
|------|------|
| デフォルト開閉 | `defaultOpen=true`（すべて開いた状態） |
| 年ヘッダー | 「2026年 (15件)」表示。タップで開閉 |
| スタイル | 既存の YearAccordion と同様のダークテーマ |

### 2.2 `components/Highlights/HighlightsContainer.tsx`（修正）

年別グループ化ロジックを追加。カードを年でグループ化し、各年を `YearSection` でラップする。

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.40.md` | **新規** | 本変更要求書 |
| `components/Highlights/YearSection.tsx` | **新規** | 年アコーディオンコンポーネント |
| `components/Highlights/HighlightsContainer.tsx` | **修正** | 年別グループ化 + YearSection 使用 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| `HighlightCard` | ✅ 変更なし | |
| タイムライン画面 | ✅ 変更なし | |