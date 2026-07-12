# ExWHYZ-Timeline タイムライン下部に「ハイライトに戻る」ボタン追加 変更要求書（v3.38）

## 📋 変更要件の整理

### v3.38での変更要件

1. **新機能**: タイムライン最下部のナビゲーションに「ハイライトに戻る」ボタンを追加する

---

## 1. 現状（v3.37）と問題の詳細

### 問題

タイムラインを最下部までスクロールした後、ハイライト画面に戻るには画面上部のタブまで戻る必要がある。下部ナビゲーションの中央が空いているので活用したい。

### 改善案

```
現状:    [◀ 前月（7月）]                                    [次月（9月）▶]

変更後:  [◀ 前月（7月）]        [ハイライトに戻る]        [次月（9月）▶]
```

---

## 2. 変更詳細

### 2.1 `components/Timeline/TimelineContainer.tsx`（修正）

- `onBackToHighlight` prop を追加
- 下部ナビゲーションの前月と次月の間に「ハイライトに戻る」ボタンを追加

```tsx
interface TimelineContainerProps {
  // ... existing props ...
  onBackToHighlight?: () => void;
}
```

### 2.2 `app/page.tsx`（修正）

`TimelineContainer` に `onBackToHighlight` prop を渡す。

```tsx
<TimelineContainer
  // ... existing props ...
  onBackToHighlight={() => setViewMode('highlight')}
/>
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.38.md` | **新規** | 本変更要求書 |
| `components/Timeline/TimelineContainer.tsx` | **修正** | `onBackToHighlight` prop追加、中央ボタン追加 |
| `app/page.tsx` | **修正** | `onBackToHighlight` prop 渡し |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| ハイライト画面 | ✅ 変更なし | |
| 上部ナビゲーション | ✅ 変更なし | `ViewModeTabs` はそのまま |