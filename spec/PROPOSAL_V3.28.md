# ExWHYZ-Timeline 概要ページ シンプル時系列カード表示へのリニューアル 変更要求書（v3.28）

## 📋 変更要件の整理

### v3.28での変更要件

1. **UI リニューアル**: 概要ページを見やすいシンプルな時系列カードリストに刷新する
2. **データ構造変更**: `highlights.json` にツアー（期間型）と単発イベント（日付型）を統合する
3. **不要コンポーネント削除**: `YearAccordion`、`MonthRow` を削除する

---

## 1. 現状（v3.27）と問題の詳細

### 問題

現在の概要ページは「年アコーディオン＋月行テーブル（2カラム）」のレイアウトで、以下の課題がある。

1. **ツアーが月ごとにバラバラに表示される**: LAST TOUR の大阪公演・北海道公演・東京公演がそれぞれ別の月に分散して表示され、一つのツアーとして認識しづらい
2. **全体的な流れが把握しづらい**: 年を開かないと中身が見えず、俯瞰性に欠ける
3. **月単位のグルーピングが冗長**: イベントのない月も空行として表示される

### ユーザーストーリー

> 「イベントが時系列順にカードで並んでいて、ツアーは期間がわかる形でまとまっているシンプルな一覧が見たい。カードをタップしたら該当月の詳細に遷移できればいい。」

---

## 2. 変更詳細

### 2.1 画面レイアウトの変更

年アコーディオン＋月行テーブルを廃止し、**縦一列のシンプルなカードリスト** に変更する。

```
┌──────────────────────────┐
│  ExWHYZ Timeline          │
│  [📊 概要] [📅 詳細]      │
├──────────────────────────┤
│                          │
│  ┌────────────────────┐  │
│  │ 🎵 ExWHYZ LAST LIVE│  │  ← 単発ライブ（日付表示）
│  │    '光'             │  │
│  │    2026年8月31日   │  │     タップで8月に遷移
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ 🎵 CLUB Ex FINAL    │  │
│  │    2026年8月15日   │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ 🎵 LAST TOUR       │  │  ← ツアー（期間表示）
│  │    'DANCE YOUR      │  │
│  │     DANCE'          │  │
│  │  2026年5月〜7月    │  │     タップで5月に遷移
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ 📢 解散発表         │  │  ← ツアー期間中の発表は
│  │    2026年5月6日    │  │     その下に自然に並ぶ
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ 🎉 SYNCHRONICITY'26│  │
│  │    2026年4月       │  │
│  └────────────────────┘  │
│  ...                     │
└──────────────────────────┘
```

#### レイアウト仕様

| 項目 | 仕様 |
|------|------|
| 表示形式 | 縦一列のカードリスト。スクロールのみ |
| ソート順 | 降順（最新が上）。ツアーは開始日基準でソート |
| カードタップ | タップで該当月（ツアーは開始月、単発は発生日月）の詳細に遷移 |
| カテゴリ表示 | アイコン（🎵🎉📢💿📺🎂）＋カテゴリ色バッジ |
| 日付表示 | ツアーは「2026年5月〜7月」、単発は「2026年5月6日」 |
| カード間 | 余白のみ。線や階層線はなし |

### 2.2 データ定義: `data/highlights.json`（修正）

概要画面に表示するカードの内容を**手動で定義する**。ツアー（期間型）と単発イベント（日付型）を統合した配列形式とする。
自動生成ロジックは使わず、必要なカードだけを直接記述する。

```json
[
  {
    "id": "evt_431",
    "type": "event",
    "title": "ExWHYZ LAST LIVE '光'",
    "date": "2026-08-31",
    "category": "live"
  },
  {
    "id": "tour_dance_your_dance",
    "type": "tour",
    "title": "LAST TOUR 'DANCE YOUR DANCE'",
    "startDate": "2026-05-06",
    "endDate": "2026-07-04",
    "category": "live"
  },
  {
    "id": "evt_387",
    "type": "event",
    "title": "解散発表",
    "date": "2026-05-06",
    "category": "announcement"
  }
]
```

#### データ構造

```typescript
interface HighlightItem {
  id: string;
  type: 'tour' | 'event';
  title: string;
  category: string;
  // type === 'event' の場合
  date?: string;           // "YYYY-MM-DD"
  // type === 'tour' の場合
  startDate?: string;      // "YYYY-MM-DD"
  endDate?: string;        // "YYYY-MM-DD"
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `type` | `"tour"` or `"event"` | イベント種別 |
| `title` | string | イベント名 |
| `category` | string | カテゴリ（`live`, `LIVE`, `announcement` 等） |
| `date` | string（event のみ） | 発生日（"YYYY-MM-DD"） |
| `startDate` | string（tour のみ） | 開始日（"YYYY-MM-DD"） |
| `endDate` | string（tour のみ） | 終了日（"YYYY-MM-DD"） |

### 2.3 コンポーネント構成の変更

```
app/page.tsx
  ├─ ViewModeTabs          （既存・変更なし）
  ├─ OverviewContainer     （修正）縦一列カードリスト
  │    └─ EventCard        （新規）イベントカード1枚
  └─ TimelineContainer     （既存・変更なし）
```

**削除するコンポーネント:**

| ファイル | 理由 |
|---------|------|
| `components/Overview/YearAccordion.tsx` | 年アコーディオン廃止 |
| `components/Overview/MonthRow.tsx` | 月行テーブル廃止 |

**新規作成:**

| ファイル | 内容 |
|---------|------|
| `components/Overview/EventCard.tsx` | イベントカードコンポーネント |

### 2.4 `EventCard.tsx` の仕様

```tsx
interface HighlightItem {
  type: 'tour' | 'event';
  title: string;
  category: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

interface EventCardProps {
  item: HighlightItem;
  onSelectMonth: (yearMonth: string) => void;
}
```

#### 表示内容

| item.type | 日付表示 | 遷移先 |
|-----------|---------|--------|
| `"tour"` | `2026年5月 〜 2026年7月` | 開始月（`startDate` の年月） |
| `"event"` | `2026年5月6日` | 発生日月（`date` の年月） |

#### 日付フォーマット

```typescript
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}
function formatYearMonth(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}
```

### 2.5 タップ時の遷移

| カード種別 | タップ時の動作 |
|-----------|-------------|
| ツアーカード | `startDate` の年月 → 詳細モードに切り替え |
| 単発イベントカード | `date` の年月 → 詳細モードに切り替え |

`OverviewContainer` は既存の `onSelectMonth` コールバックを通じて `page.tsx` に年月を伝える。

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.28.md` | **新規** | 本変更要求書 |
| `data/highlights.json` | **修正** | `type` フィールド追加、ツアーを期間データに統合、配列形式に |
| `components/Overview/EventCard.tsx` | **新規** | イベントカードコンポーネント |
| `components/Overview/OverviewContainer.tsx` | **修正** | 縦一列カードリストに置き換え |
| `components/Overview/YearAccordion.tsx` | **削除** | 不要 |
| `components/Overview/MonthRow.tsx` | **削除** | 不要 |

---

## 4. 修正の影響範囲

### 4.1 既存機能への影響

| 項目 | 影響 | 備考 |
|------|------|------|
| タイムライン詳細画面 | ✅ 変更なし | `TimelineContainer`、`MonthPagination`、`DayEntry` はそのまま |
| モード切替 | ✅ 変更なし | `ViewModeTabs`、`page.tsx` は変更なし |
| API / キャッシュ | ✅ 変更なし | 影響なし |

### 4.2 スマホ対応

| 項目 | 方針 |
|------|------|
| 横スクロール | なし（すべて縦） |
| カード幅 | 画面幅いっぱい（`w-full`）、パディングで余白確保 |
| タップ領域 | カード全体をタップ可能に |

---

## 5. 実装フェーズ案

### フェーズ1: データ定義
- [ ] `data/highlights.json` に概要画面用のカード情報を手動で定義する

### フェーズ2: コンポーネント実装
- [ ] `components/Overview/EventCard.tsx` 作成
- [ ] `components/Overview/OverviewContainer.tsx` 修正（カードリストに置き換え）

### フェーズ3: 不要ファイル削除
- [ ] `components/Overview/YearAccordion.tsx` 削除
- [ ] `components/Overview/MonthRow.tsx` 削除

### フェーズ4: 動作確認
- [ ] TypeScript コンパイル確認
- [ ] モックモードでの表示確認

---

## 6. 次のステップ

この変更要求書（v3.28）の内容でご承認いただけましたら、実装を進めます。

ご確認・ご意見をお願いいたします！🎉