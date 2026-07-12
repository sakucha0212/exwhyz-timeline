# ExWHYZ-Timeline 文言統一・リファクタリング 変更要求書（v3.31）

## 📋 変更要件の整理

### v3.31での変更要件

1. **文言統一**: 画面モード名を「概要」「詳細」から「ハイライト」「タイムライン」に統一
2. **リファクタリング**: コンポーネント名・ディレクトリ名を統一された文言に合わせてリネーム

---

## 1. 現状（v3.30）と問題の詳細

### 問題

- タブ表示が「概要」「詳細」で、ユーザーにとって分かりづらい
- コンポーネント名が `OverviewContainer`/`EventCard` で、実際の画面名（ハイライト/タイムライン）と一致していない
- `ViewMode` 型の値が `'overview'/'detail'` で、画面文言とコードが不整合

---

## 2. 変更詳細

### 2.1 画面文言の変更

| 場所 | 変更前 | 変更後 |
|------|--------|--------|
| タブ1 | 「📊 概要」 | 「📊 ハイライト」 |
| タブ2 | 「📅 詳細」 | 「📅 タイムライン」 |
| ツールチップ | 「概要から月を選択してください」 | 「ハイライトから月を選択してください」 |
| ツールチップ | 「タイムライン詳細を見る」 | 「タイムラインを見る」 |

### 2.2 型・変数名の変更

| 場所 | 変更前 | 変更後 |
|------|--------|--------|
| `ViewMode` 型 | `'overview' \| 'detail'` | `'highlight' \| 'timeline'` |
| `page.tsx` 状態初期値 | `useState<ViewMode>('overview')` | `useState<ViewMode>('highlight')` |
| `page.tsx` 遷移先 | `setViewMode('detail')` | `setViewMode('timeline')` |
| `page.tsx` 条件分岐 | `viewMode === 'overview'` | `viewMode === 'highlight'` |
| `page.tsx` コメント | 「概要チャート」「詳細モード」 | 「ハイライト」「タイムラインモード」 |

### 2.3 コンポーネントのリネーム

| 変更前 | 変更後 |
|--------|--------|
| `components/Overview/OverviewContainer.tsx` | `components/Highlights/HighlightsContainer.tsx` |
| `components/Overview/EventCard.tsx` | `components/Highlights/HighlightCard.tsx` |

`components/Overview/` ディレクトリは削除し、新たに `components/Highlights/` を作成する。

### 2.4 `page.tsx` の import 変更

```typescript
// 変更前
import OverviewContainer from '@/components/Overview/OverviewContainer';

// 変更後
import HighlightsContainer from '@/components/Highlights/HighlightsContainer';
```

JSX 内の `<OverviewContainer ...>` → `<HighlightsContainer ...>` に変更。

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.31.md` | **新規** | 本変更要求書 |
| `components/ViewModeTabs.tsx` | **修正** | タブ文言＋モード値を変更 |
| `app/page.tsx` | **修正** | 文言＋import パス＋変数名変更 |
| `components/Overview/OverviewContainer.tsx` | **移動＋リネーム** | → `components/Highlights/HighlightsContainer.tsx` |
| `components/Overview/EventCard.tsx` | **移動＋リネーム** | → `components/Highlights/HighlightCard.tsx` |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| タイムライン詳細画面 | ✅ 変更なし | `TimelineContainer` は変更なし |
| `highlights.json` | ✅ 変更なし | 影響なし |
| 機能・動作 | ✅ 完全同一 | 表示文言とコード名のみの変更 |