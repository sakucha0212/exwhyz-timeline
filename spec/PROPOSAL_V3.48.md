# ExWHYZ-Timeline 「This page couldn't load」エラー修正 変更提案書（v3.48）

## 📋 変更要件の整理

### v3.48 での変更要件

1. **バグ修正**: ハイライトページで「This page couldn't load」エラーが発生する問題を修正する
2. **型の拡張**: `type: "event"` をサポート対象に追加する
3. **堅牢性向上**: `date` フィールドが欠損している場合のフォールバック処理を追加する

---

## 1. 現状（v3.47）と問題の詳細

### 問題

`highlights.json` を修正後、ハイライトページを開くと「This page couldn't load」エラーが発生し、ページ全体がクラッシュする。

### 根本原因

#### 原因1: `type: "event"` が許可されていない

`highlights.json` に `"type": "event"` のエントリが 2 件存在する：

| id | title | date | startDate | endDate |
|----|-------|------|-----------|---------|
| `evt_A01` | EMIチェキ練習会@代官山UNIT | `2022-07-10` | — | — |
| `evt_002` | 渋谷で ｱｵッ！渋谷でWACKなりの祭 | — | `2022-06-16` | `2022-06-26` |

しかし、`HighlightItem` インターフェースの `type` は `'tour' | 'live' | 'festival' | 'announcement'` のみで、`'event'` が含まれていない。

#### 原因2: `date` フィールドの欠損（`evt_002`）

`evt_002` は `date` フィールドを持たず `startDate`/`endDate` のみ。

`HighlightCard.tsx` L68-73 のロジック：
```typescript
const dateText = item.type === 'tour'
  ? `${formatDate(item.startDate!)} 〜 ${formatDate(item.endDate!)}`
  : formatDate(item.date!);
```

`type` が `'event'`（`'tour'` 以外）の場合、`item.date!` を参照する。しかし `evt_002` では `date` が `undefined` のため、
`formatDate(undefined)` → `undefined.split('-')` → **`TypeError: Cannot read properties of undefined (reading 'split')`** が発生し、ページ全体がクラッシュする。

> 注: `tour_seihowhyz` は既に `type` が `live` → `tour` に修正済みのため、本提案の対象外。

---

## 2. 変更詳細

### 2.1 型定義の拡張

3 つのコンポーネントで `HighlightItem.type` のユニオン型に `'event'` を追加する。

```typescript
// 変更前
type: 'tour' | 'live' | 'festival' | 'announcement';

// 変更後
type: 'tour' | 'live' | 'festival' | 'announcement' | 'event';
```

**対象ファイル**:
- `components/Highlights/HighlightCard.tsx`
- `components/Highlights/HighlightsContainer.tsx`
- `components/Highlights/FilterBar.tsx`

### 2.2 日付表示の堅牢化

`HighlightCard.tsx` の日付取得ロジックを、`startDate`/`endDate` の有無で判定する方式に変更する。

```typescript
// 変更前
const targetYM = item.type === 'tour'
  ? formatYearMonth(item.startDate!)
  : formatYearMonth(item.date!);

const dateText = item.type === 'tour'
  ? `${formatDate(item.startDate!)} 〜 ${formatDate(item.endDate!)}`
  : formatDate(item.date!);

// 変更後
function hasDateRange(item: HighlightItem): boolean {
  return !!item.startDate && !!item.endDate;
}

function getDateStr(item: HighlightItem): string {
  return item.date ?? item.startDate!;
}

const targetYM = hasDateRange(item)
  ? formatYearMonth(item.startDate!)
  : formatYearMonth(getDateStr(item));

const dateText = hasDateRange(item)
  ? `${formatDate(item.startDate!)} 〜 ${formatDate(item.endDate!)}`
  : formatDate(getDateStr(item));
```

### 2.3 `event` タイプのスタイル追加

| 項目 | 値 |
|------|-----|
| ラベル | `イベント` |
| アイコン | `🎉` |
| バッジ色 | `bg-purple-950/40 text-purple-400/80 border-purple-900/50` |
| ボーダー色 | `border-l-purple-500/60` |

### 2.4 修正後の期待動作

| エントリ | 表示される日付 |
|----------|---------------|
| `evt_A01` (`type: event`, `date` あり) | `2022年7月10日` |
| `evt_002` (`type: event`, `date` なし, `startDate`/`endDate` あり) | `2022年6月16日 〜 2022年6月26日` |

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.48.md` | **新規** | 本変更提案書 |
| `components/Highlights/HighlightCard.tsx` | **修正** | `'event'` 型追加、日付フォールバックロジック、色/アイコン追加 |
| `components/Highlights/HighlightsContainer.tsx` | **修正** | `'event'` 型追加 |
| `components/Highlights/FilterBar.tsx` | **修正** | `'event'` 型追加、色設定追加 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| `YearSection` | ✅ 変更なし | props は変わらず |
| `page.tsx` | ✅ 変更なし | |
| `highlights.json` | ✅ 変更なし | |
| タイムライン画面 | ✅ 変更なし | |

---

## 5. 実装フェーズ案

### フェーズ1: 変更提案書作成
- [ ] `spec/PROPOSAL_V3.48.md` を作成

### フェーズ2: コンポーネント修正
- [ ] `HighlightCard.tsx` — 型拡張、日付ロジック修正、event スタイル追加
- [ ] `HighlightsContainer.tsx` — 型拡張
- [ ] `FilterBar.tsx` — 型拡張、event スタイル追加

### フェーズ3: 動作確認
- [ ] TypeScript コンパイル確認
- [ ] `npm run dev` でページ表示確認