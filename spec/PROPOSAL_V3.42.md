# ExWHYZ-Timeline ハイライト画面の色味調整（控えめ色）変更要求書（v3.42）

## 📋 変更要件の整理

### v3.42での変更要件

1. **色味調整**: 年ヘッダーからピンク色を廃止し、モノクロ（グレー）に変更する
2. **色味調整**: タイプバッジの色を彩度を抑えた控えめな色に変更する

---

## 1. 現状（v3.41）と問題の詳細

### 問題

- 年タイトルが `text-exwhyz-pink-light` で毒々しい
- 年左ボーダーがピンクで、タイプバッジの色と合わせて5色が画面に乱立し、ごちゃごちゃしている
- タイプバッジの彩度が高く、強調されすぎている

### 改善方針

- 年ヘッダーはモノクロ（グレー）に戻し、構造的な区切りとして機能させる
- タイプバッジは `bg-xxx-950/40 + text-xxx-400/80` で彩度を抑え、落ち着いた印象にする

---

## 2. 変更詳細

### 2.1 `components/Highlights/YearSection.tsx`（修正）

| プロパティ | 変更前 | 変更後 |
|-----------|--------|--------|
| 左ボーダー | `border-l-4 border-exwhyz-pink` | `border-l-4 border-gray-600` |
| 年タイトル色 | `text-exwhyz-pink-light` | `text-white` |

### 2.2 `components/Highlights/HighlightCard.tsx`（修正）

| タイプ | 変更前 | 変更後 |
|--------|--------|--------|
| ツアー | `bg-pink-900/50 text-pink-300` | `bg-pink-950/40 text-pink-400/80` |
| ライブ | `bg-green-900/50 text-green-300` | `bg-green-950/40 text-green-400/80` |
| フェス | `bg-orange-900/50 text-orange-300` | `bg-orange-950/40 text-orange-400/80` |
| 発表 | `bg-blue-900/50 text-blue-300` | `bg-blue-950/40 text-blue-400/80` |

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.42.md` | **新規** | 本変更要求書 |
| `components/Highlights/YearSection.tsx` | **修正** | ピンク→グレー（ボーダー・文字色） |
| `components/Highlights/HighlightCard.tsx` | **修正** | タイプバッジ色を控えめに（4行） |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| タイムライン画面 | ✅ 変更なし | |
| ハイライトコンテナ | ✅ 変更なし | |