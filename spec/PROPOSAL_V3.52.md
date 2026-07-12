# ExWHYZ-Timeline ハイライトカードのアイコン調整 変更提案書（v3.52）

## 📋 変更要件の整理

### v3.52 での変更要件

1. **UI 調整**: ハイライトカードのタイトル左側アイコンを削除する
2. **例外**: 発表（`announcement`）のみアイコン 📢 を維持して目立たせる

---

## 1. 現状（v3.51）と問題の詳細

### 現状

全タイプにアイコンが付与されており、特に 🎵 が `tour` と `live` で重複しているため区別がつかず、視覚的ノイズになっている。

| タイプ | アイコン |
|--------|----------|
| `tour` | 🎵 |
| `live` | 🎵 |
| `announcement` | 📢 |
| `event` | 🎉 |
| `release` | 💿 |

### 要件

- 基本的にはアイコンをなくし、タイトルをすっきり表示したい
- ただし発表（announcement）は重要な情報なので、アイコンで目立たせたい

---

## 2. 変更詳細

### 2.1 HighlightCard.tsx — `getTypeIcon` 関数

`announcement` 以外のアイコンを空文字列に変更。発表は 📢 を維持。

```typescript
// 変更前
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    tour: '🎵',
    live: '🎵',
    announcement: '📢',
    event: '🎉',
    release: '💿',
  };
  return icons[type] ?? '📌';
}

// 変更後
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    tour: '',
    live: '',
    announcement: '📢',
    event: '',
    release: '',
  };
  return icons[type] ?? '';
}
```

### 2.2 アイコン span 要素の表示制御

アイコンが空文字列の場合でも span 要素自体は残る（flex-shrink-0 のスペースを維持）ため、表示上の問題はない。空文字列の span は幅0でレンダリングされる。

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.52.md` | **新規** | 本変更提案書 |
| `components/Highlights/HighlightCard.tsx` | **修正** | `getTypeIcon` 関数のアイコン定義変更 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| `FilterBar` | ✅ 変更なし | |
| `HighlightsContainer` | ✅ 変更なし | |
| `YearSection` | ✅ 変更なし | |
| `highlights.json` | ✅ 変更なし | |