# ExWHYZ-Timeline ハイライトカード種別色の分離 変更要求書（v3.36）

## 📋 変更要件の整理

### v3.36での変更要件

1. **UI改善**: ツアー・ライブ・フェスのバッジ色をそれぞれ異なる色に分離する

---

## 1. 現状（v3.35）と問題の詳細

### 問題

`HighlightCard` の `getTypeColor` 関数で、`tour`/`live`/`festival` の3種別がすべて同じピンク色で表示されており、視覚的に区別できない。

```typescript
tour: 'bg-pink-900/50 text-pink-300 border-pink-800',
live: 'bg-pink-900/50 text-pink-300 border-pink-800',    // ← ツアーと同じ
festival: 'bg-pink-900/50 text-pink-300 border-pink-800',  // ← ツアーと同じ
```

---

## 2. 変更詳細

### 2.1 `components/Highlights/HighlightCard.tsx` — `getTypeColor` を修正

| `type` | 変更前 | 変更後 |
|--------|--------|--------|
| `tour` | ピンク | **ピンク**（ExWHYZカラー、メイン） |
| `live` | ピンク | **グリーン** |
| `festival` | ピンク | **オレンジ** |
| `announcement` | 青 | 青（変更なし） |

```typescript
// 変更後
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    tour: 'bg-pink-900/50 text-pink-300 border-pink-800',
    live: 'bg-green-900/50 text-green-300 border-green-800',
    festival: 'bg-orange-900/50 text-orange-300 border-orange-800',
    announcement: 'bg-blue-900/50 text-blue-300 border-blue-800',
  };
  return colors[type] ?? 'bg-gray-800 text-gray-300 border-gray-700';
}
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.36.md` | **新規** | 本変更要求書 |
| `components/Highlights/HighlightCard.tsx` | **修正** | `getTypeColor` の色定義を修正（`live`/`festival` の2行） |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| ハイライトカードのバッジ | ✅ ツアー=ピンク、ライブ=グリーン、フェス=オレンジ | |
| その他 | ✅ 変更なし | |