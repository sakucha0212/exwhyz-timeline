# ExWHYZ-Timeline ハイライトのカテゴリ絞り込み機能追加 変更要求書（v3.47）

## 📋 変更要件の整理

### v3.47での変更要件

1. **新機能**: ハイライト一覧にカテゴリ絞り込みフィルターを追加する
2. **複数選択**: 複数カテゴリを同時に選択可能
3. **デフォルト全表示**: 初期状態ではすべてのカテゴリが表示される

---

## 1. 現状（v3.46）と問題の詳細

### 問題

ハイライトページには全36件のイベントがすべて表示されており、以下の課題がある：

- ツアーだけを見たい、ライブだけを見たいといった絞り込みができない
- 縦に長いリストから目的のイベントを探すのが大変
- 特定の年の特定のイベントを探す際に、関係ないタイプのイベントが目に入る

### ユーザーストーリー

> 「ツアーだけを見たい」「ライブとフェスだけをまとめて見たい」といった絞り込みができると便利。

---

## 2. 変更詳細

### 2.1 画面レイアウト

年アコーディオンの上部に絞り込みボタンを配置する。

```
┌──────────────────────────────────┐
│  [すべて(36)] [ツアー(9)] [ライブ(11)] [フェス(5)] [発表(11)]  │
├──────────────────────────────────┤
│  ▼ 2026年 (15件)                  │
│  │ ▌🎵 LAST TOUR...    ツアー    │
│  │ ▌🎵 CLUB Ex...     ライブ    │
│  │ ...                           │
│  ▼ 2025年 (8件)                  │
│  ...                             │
└──────────────────────────────────┘
```

### 2.2 フィルターボタンの仕様

| 項目 | 仕様 |
|------|------|
| ボタン種類 | 「すべて」＋ 各カテゴリ（ツアー/ライブ/フェス/発表） |
| 表示内容 | ラベル名 + 件数（例: `ツアー(9)`） |
| デフォルト状態 | 「すべて」が選択状態 |
| 選択操作 | タップでON/OFF切替 |
| 複数選択 | 可能（例: ツアーとライブの両方を選択 → 両方表示） |
| 「すべて」タップ | 全フィルターを解除し、全件表示に戻す |
| カテゴリボタンタップ | 「すべて」の選択が解除され、そのカテゴリのみ選択状態に |
| 全カテゴリ選択 | 「すべて」タップと同じ挙動（全部選択 = 全件表示） |

### 2.3 フィルタリングロジック

```typescript
// activeFilters が空 → 全件表示
// activeFilters に値がある → そのタイプのアイテムのみ表示

function filterItems(items: HighlightItem[], activeFilters: Set<string>): HighlightItem[] {
  if (activeFilters.size === 0) return items;
  return items.filter(item => activeFilters.has(item.type));
}
```

### 2.4 年アコーディオンの表示

フィルター適用後、該当するアイテムが0件になった年はアコーディオン自体を非表示にする。

| 状態 | 表示 |
|------|------|
| フィルター後1件以上 | 年アコーディオンを表示（件数も更新） |
| フィルター後0件 | 年アコーディオンを非表示 |

### 2.5 タイプ色の統一

`FilterBar` と `HighlightCard` で同じ色定義を使うため、色定義を共有化する。

| タイプ | ラベル | 色 |
|--------|--------|-----|
| `tour` | ツアー | `bg-pink-950/40 text-pink-400/80 border-pink-900/50` |
| `live` | ライブ | `bg-green-950/40 text-green-400/80 border-green-900/50` |
| `festival` | フェス | `bg-orange-950/40 text-orange-400/80 border-orange-900/50` |
| `announcement` | 発表 | `bg-blue-950/40 text-blue-400/80 border-blue-900/50` |

### 2.6 コンポーネント構成

```
HighlightsContainer
  ├─ FilterBar (新規) — カテゴリ絞り込みボタン群
  └─ YearSection[] (既存) — フィルター後の年別アコーディオン
       └─ HighlightCard[] (既存)
```

### 2.7 実装方針

フィルター状態（`activeFilters`）は `page.tsx` で管理し、`HighlightsContainer` に props として渡す。これにより、ハイライト→タイムライン→ハイライトと画面遷移してもフィルター状態が保持される。

```typescript
// page.tsx
const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

<HighlightsContainer
  onSelectMonth={handleSelectMonth}
  activeFilters={activeFilters}
  onFilterChange={setActiveFilters}
/>
```

```typescript
// HighlightsContainer
interface HighlightsContainerProps {
  onSelectMonth: (yearMonth: string) => void;
  activeFilters: Set<string>;
  onFilterChange: (filters: Set<string>) => void;
}
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.47.md` | **新規** | 本変更要求書 |
| `components/Highlights/FilterBar.tsx` | **新規** | カテゴリ絞り込みボタン群コンポーネント |
| `components/Highlights/HighlightsContainer.tsx` | **修正** | `activeFilters` を props で受け取り、フィルタリングロジックを適用 |
| `app/page.tsx` | **修正** | `activeFilters` 状態を管理し、`HighlightsContainer` に渡す |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| `HighlightCard` | ✅ 変更なし | 色定義は既存と共有（変更不要） |
| `YearSection` | ✅ 変更なし | props は変わらず |
| `app/page.tsx` | フィルター状態を追加 | props 経由で受け渡し |
| タイムライン画面 | ✅ 変更なし | |

---

## 5. 実装フェーズ案

### フェーズ1: FilterBar 作成
- [ ] `components/Highlights/FilterBar.tsx` を作成

### フェーズ2: HighlightsContainer 修正
- [ ] フィルター状態管理 (`useState<Set<string>>`) 追加
- [ ] フィルタリングロジック追加
- [ ] `FilterBar` の統合

### フェーズ3: 動作確認
- [ ] TypeScript コンパイル確認
- [ ] フィルター切替の動作確認
- [ ] 複数選択の動作確認

---

## 6. 次のステップ

この変更要求書（v3.47）の内容でご承認いただけましたら、実装を進めます。

ご確認・ご意見をお願いいたします！🎉