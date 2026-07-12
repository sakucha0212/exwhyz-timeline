# ExWHYZ-Timeline 概要チャート画面追加 変更要求書（v3.24）

## 📋 変更要件の整理

### v3.24での変更要件

1. **新機能**: イベントの全体像を俯瞰できる「概要チャート画面」を追加する
2. **画面遷移**: 概要チャート画面と既存のタイムライン詳細画面を、同ページ内でモード切替できるようにする
3. **データ定義**: チャート表示用のハイライトイベントを別JSONで定義する

---

## 1. 現状（v3.23）と問題の詳細

### 問題

現在のアプリは年月ごとのページ表示だが、月ナビゲーションには「どの月にイベントがあるか」を示す情報が一切ない。

- 年・月ドロップダウンは単に "1月", "2月"... と表示されるのみ
- ユーザーは手探りで月を移動しながらイベントを探すしかない
- ツアーの期間や大きなイベントを俯瞰できる入口が存在しない

### ユーザーストーリー

> 「ツアーの期間や大きなイベントを一覧できる画面がほしい。そこから気になる月を選んで、該当月のタイムライン詳細を見たい。」

---

## 2. 変更詳細

### 2.1 画面構成の変更

現在の1画面構成から、**モード切替による2画面構成**に変更する。

```
┌─────────────────────────────────┐
│  ExWHYZ Timeline                 │
│  [📊 概要] [📅 詳細]             │  ← モード切替タブ
├─────────────────────────────────┤
│  (選択中のモードの画面)           │
└─────────────────────────────────┘
```

| モード | 内容 |
|--------|------|
| 📊 概要 | 新規追加。全期間のイベントを俯瞰できるチャート画面 |
| 📅 詳細 | 既存。選択した年月のタイムライン詳細（現在の MonthPagination + DayEntry） |

### 2.2 概要チャート画面のレイアウト

2つのセクションで構成する。

#### セクション1: ツアー一覧

```
┌──────────────────────────┐
│  🎵 ツアー                │
│  ┌──────────────────────┐│
│  │ LAST TOUR             ││
│  │ 'DANCE YOUR DANCE'    ││
│  │ 2026年 5月 → 7月     ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │ FIRST TOUR xYZ        ││
│  │ 2022年10月 → 2023年  ││
│  │ 1月                   ││
│  └──────────────────────┘│
└──────────────────────────┘
```

ツアーカードをタップすると、開始月のタイムライン詳細に遷移する。

#### セクション2: 年月別イベント一覧（2カラムテーブル）

年ごとにアコーディオン開閉。各年の中は左列=月ラベル、右列=イベントリストの2カラム。

```
┌──────────────────────────┐
│  📅 年月別               │
│  ▼ 2026年                │
│  ┌────┬─────────────────┐│
│  │ 1月│                 ││
│  ├────┼─────────────────┤│
│  │ 2月│                 ││
│  ├────┼─────────────────┤│
│  │ 3月│                 ││
│  ├────┼─────────────────┤│
│  │ 4月│                 ││
│  ├────┼─────────────────┤│
│  │ 5月│ 解散発表         ││
│  │    │ TONIGHT配信      ││
│  │    │ 大特典会         ││
│  ├────┼─────────────────┤│
│  │ 6月│ 生誕             ││
│  │    │ 山形公演         ││
│  ├────┼─────────────────┤│
│  │ 7月│ リリイベ大阪     ││
│  │    │ リミトーク       ││
│  │    │ 沖縄             ││
│  ├────┼─────────────────┤│
│  │ 8月│ LAST LIVE '光'   ││
│  │    │ PEDROWHYZ        ││
│  │    │ CLUB Ex          ││
│  ├────┼─────────────────┤│
│  │ ...│ ...              ││
│  └────┴─────────────────┘│
│                          │
│  ▶ 2025年                │  ← 閉じた状態（タップで展開）
│  ▶ 2024年                │
│  ▶ 2023年                │
│  ▶ 2022年 (6月〜)       │
└──────────────────────────┘
```

##### レイアウト仕様

| 項目 | 仕様 |
|------|------|
| 左列 | 固定幅（約3em）、月ラベル（"1月"〜"12月"）を表示 |
| 右列 | イベント名を縦積み。複数ある場合は行の高さが伸びる |
| 空月 | 常に12ヶ月すべて表示。イベントがない月は右列が空欄 |
| 年ブロック | アコーディオン式。初期表示は最新年のみ開く |
| 月行タップ | 該当月の「詳細」モードに切り替え、対象年月のタイムラインを表示 |

### 2.3 データ定義: `data/highlights.json`（新規）

```json
{
  "tours": [
    {
      "id": "tour_dance_your_dance",
      "title": "LAST TOUR 'DANCE YOUR DANCE'",
      "startYearMonth": "2026-05",
      "endYearMonth": "2026-07",
      "category": "live"
    }
  ],
  "events": [
    {
      "id": "evt_disband",
      "title": "解散発表",
      "yearMonth": "2026-05",
      "category": "announcement"
    },
    {
      "id": "evt_last_live",
      "title": "ExWHYZ LAST LIVE '光'",
      "yearMonth": "2026-08",
      "category": "live"
    }
  ]
}
```

#### データ構造

```typescript
interface HighlightsData {
  tours: TourEntry[];
  events: HighlightEvent[];
}

interface TourEntry {
  id: string;
  title: string;
  startYearMonth: string;  // "YYYY-MM"
  endYearMonth: string;    // "YYYY-MM"
  category: string;
}

interface HighlightEvent {
  id: string;
  title: string;
  yearMonth: string;       // "YYYY-MM"
  category: string;
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `tours[].id` | string | ツアー識別子 |
| `tours[].title` | string | ツアー名 |
| `tours[].startYearMonth` | string | 開始年月（"YYYY-MM"） |
| `tours[].endYearMonth` | string | 終了年月（"YYYY-MM"） |
| `tours[].category` | string | カテゴリ（カテゴリバッジの表示に使用） |
| `events[].id` | string | イベント識別子 |
| `events[].title` | string | イベント名 |
| `events[].yearMonth` | string | イベント発生日（"YYYY-MM"） |
| `events[].category` | string | カテゴリ |

### 2.4 モード切替と画面遷移

#### `app/page.tsx`（修正）

```typescript
// モード管理
type ViewMode = 'overview' | 'detail';
const [viewMode, setViewMode] = useState<ViewMode>('overview');
const [targetYearMonth, setTargetYearMonth] = useState<string | null>(null);

// 概要チャートで月が選択されたら、詳細モードに切り替え
function handleSelectMonth(yearMonth: string) {
  setTargetYearMonth(yearMonth);
  setViewMode('detail');
}
```

| 操作 | 動作 |
|------|------|
| 概要チャートの月行タップ | 対象年月をセットし、詳細モードに切り替え |
| 概要チャートのツアーカードタップ | ツアー開始月をセットし、詳細モードに切り替え |
| 「📅 詳細」タブ | 最後に選択した年月の詳細を表示 |
| 「📊 概要」タブ | 概要チャートに戻る（ステート保持） |
| 詳細画面の月ナビゲーション | 既存通り、前月/次月/年月ドロップダウンで移動可能 |

#### 画面遷移図

```
┌──────────┐  月/ツアータップ  ┌──────────────┐
│ 📊 概要  │ ────────────────→ │ 📅 詳細       │
│          │ ←──────────────── │              │
└──────────┘  「概要」タブ     └──────────────┘
                 または
             MonthPagination
             で別の月を選択
```

- すべて同ページ（`/`）内で完結
- ブラウザバック不要
- ステートはページ内で保持

### 2.5 コンポーネント構成

```
app/page.tsx
  ├─ ViewModeTabs          （新規）モード切替タブ
  ├─ OverviewContainer     （新規）概要チャート全体
  │    ├─ TourSection      （新規）ツアー一覧
  │    │    └─ TourCard    （新規）ツアーカード
  │    └─ YearAccordion    （新規）年アコーディオン（複数）
  │         └─ MonthRow    （新規）月行（左=月ラベル、右=イベントリスト）
  └─ TimelineContainer     （既存）詳細タイムライン
       ├─ MonthPagination   （既存）
       └─ DayEntry[]        （既存）
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `data/highlights.json` | **新規** | ハイライトイベント定義（ツアー＋単発イベント） |
| `components/Overview/OverviewContainer.tsx` | **新規** | 概要チャート画面のルートコンポーネント |
| `components/Overview/TourSection.tsx` | **新規** | ツアー一覧セクション |
| `components/Overview/TourCard.tsx` | **新規** | ツアーカード（タイトル、期間、カテゴリバッジ） |
| `components/Overview/YearAccordion.tsx` | **新規** | 年アコーディオン（開閉＋全月表示） |
| `components/Overview/MonthRow.tsx` | **新規** | 月行（2カラム：月ラベル＋イベントリスト） |
| `components/ViewModeTabs.tsx` | **新規** | モード切替タブ（概要 / 詳細） |
| `app/page.tsx` | **修正** | モード切替ロジック追加。`ViewModeTabs`、`OverviewContainer` の統合 |
| `components/Timeline/TimelineContainer.tsx` | **修正** | `targetYearMonth` を props で受け取り可能に |

---

## 4. 修正の影響範囲

### 4.1 既存機能への影響

| 項目 | 影響 | 備考 |
|------|------|------|
| タイムライン詳細画面 | ✅ 変更なし | 既存の `TimelineContainer`、`MonthPagination`、`DayEntry` はそのまま使用 |
| API 呼び出し | ✅ 変更なし | ツイートデータ取得ロジックには一切触れない |
| IndexedDB キャッシュ | ✅ 変更なし | スキーマ変更なし |
| 認証 | ✅ 変更なし | ログイン・セッション管理は変更なし |
| `timeline.json` | ✅ 変更なし | 既存の全イベントデータはそのまま |
| URL 構造 | ✅ 変更なし | すべて `/` で完結。URL パラメータは不使用 |

### 4.2 スマホ対応

| 項目 | 方針 |
|------|------|
| 横スクロール | なし。すべて縦スクロール |
| 2カラム | 左列=固定幅（約3em）、右列=flex-grow |
| タップ領域 | 月行全体をタップ可能領域として十分な高さを確保 |
| アコーディオン | 年ヘッダーをタップで開閉。デフォルトは最新年のみ展開 |
| モード切替タブ | 画面上部に固定表示。タブ間の移動は即時 |

---

## 5. 実装フェーズ案

### フェーズ1: データ定義
- [ ] `data/highlights.json` を作成（ツアーと主要イベントを定義）

### フェーズ2: コンポーネント実装
- [ ] `components/Overview/MonthRow.tsx` 作成
- [ ] `components/Overview/YearAccordion.tsx` 作成
- [ ] `components/Overview/TourCard.tsx` 作成
- [ ] `components/Overview/TourSection.tsx` 作成
- [ ] `components/Overview/OverviewContainer.tsx` 作成
- [ ] `components/ViewModeTabs.tsx` 作成

### フェーズ3: 画面統合
- [ ] `app/page.tsx` 修正（モード切替ロジック、OverviewContainer 統合）
- [ ] `components/Timeline/TimelineContainer.tsx` 修正（`targetYearMonth` prop 対応）

### フェーズ4: 動作確認
- [ ] モックモードでの表示確認
- [ ] モード切替の動作確認
- [ ] スマホ表示の確認

---

## 6. 次のステップ

この変更要求書（v3.24）の内容でご承認いただけましたら、実装を進めます。

ご確認・ご意見をお願いいたします！🎉