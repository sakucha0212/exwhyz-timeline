# ExWHYZ-Timeline UIの月単位表示およびデータ取得・キャッシュロジックの最適化 変更要求書（v3.16）

## 📋 変更要件の整理

### v3.16での変更要件

1. **月単位ページネーション表示**: 全件一括表示から月ごとの表示に切り替え、DOMレンダリング負荷を軽減する
2. **IndexedDBキャッシュ**: LocalStorageから容量制限のないIndexedDBへ移行する
3. **月単位のデータ取得戦略**: 過去月はキャッシュ優先、当月は差分更新、未来月は取得不可

---

## 1. 現状の仕組み（v3.15）

| ファイル | 役割 |
|---------|------|
| `components/Timeline/TimelineContainer.tsx` | 全期間のツイートを一括表示。`YearMonthNav` でスクロールジャンプ |
| `components/Timeline/YearMonthNav.tsx` | 年月ドロップダウン（スクロールジャンプ用） |
| `hooks/useTwitterData.ts` | ツイートデータの取得・状態管理 |
| `lib/cache.ts` | `localStorage` にツイートキャッシュ・最終取得日時を保存 |
| `lib/data-provider.ts` | キャッシュチェック → API呼び出し → キャッシュ保存のロジック |
| `app/api/tweets/fetch/route.ts` | サーバー側APIエンドポイント。`startTime`/`endTime` パラメータで期間指定 |
| `lib/twitter-api.ts` | `fetchUserArchiveTweets()` で X API を呼び出す。`EXWHYZ_SEARCH_QUERY` を保持 |

**現状の課題:**
- `TimelineContainer` が全期間の日付を一括レンダリングしており、DOMが肥大化する
- `localStorage` は容量制限（約5MB）があり、大量のツイートキャッシュに不向き
- 月単位のキャッシュ管理がなく、毎回全件取得または全件キャッシュ参照になっている

---

## 2. アーキテクチャ変更の概要

```
【変更前】
useTwitterData → data-provider → API（全期間）
                              → localStorage（全件キャッシュ）
TimelineContainer → 全期間一括表示

【変更後】
useMonthlyTwitterData(year, month) → data-provider-monthly → API（月単位）
                                                           → IndexedDB（月単位キャッシュ）
TimelineContainer → 選択月のみ表示
MonthPagination（新規） → 前月/次月ボタン + 年月ピッカー
```

---

## 3. 変更詳細

### 3.1 `lib/idb-cache.ts`（新規作成）— IndexedDBキャッシュ

LocalStorageを廃止し、IndexedDBを使用した月単位キャッシュを実装します。

**DBスキーマ:**
- DB名: `exwhyz_timeline_cache`
- ストア名: `monthly_tweets`
- キー: `"YYYY-MM"` 形式の文字列（例: `"2024-06"`）
- 値: `{ yearMonth: string, tweets: DayData[], fetchedAt: string, isCurrent: boolean, latestTweetId: string | null }`

```ts
// IndexedDB のオープン・初期化
export async function openDB(): Promise<IDBDatabase>

// 月単位キャッシュの取得
export async function getMonthlyCache(yearMonth: string): Promise<MonthlyCache | null>

// 月単位キャッシュの保存
export async function setMonthlyCache(
  yearMonth: string,
  tweets: DayData[],
  isCurrent: boolean
): Promise<void>

// 月単位キャッシュへの差分マージ（当月更新用）
export async function mergeMonthlyCache(
  yearMonth: string,
  newTweets: DayData[]
): Promise<void>

// 最新ツイートIDの取得（差分更新の since_id 用）
export async function getLatestTweetId(yearMonth: string): Promise<string | null>

// 最終取得日時の取得・保存（IndexedDB内に保存）
export async function getLastFetchedAt(): Promise<string | null>
export async function setLastFetchedAt(isoString: string): Promise<void>
```

**既存の `lib/cache.ts` との関係:**
- `lib/cache.ts` は後方互換のため残すが、新機能では `lib/idb-cache.ts` を使用する
- 将来的に `lib/cache.ts` は削除予定（v3.17以降）

### 3.2 `lib/data-provider-monthly.ts`（新規作成）— 月単位データ取得

月単位のデータ取得ロジックを実装します。`EXWHYZ_SEARCH_QUERY` の検索条件は維持します。

```ts
/**
 * 指定月のツイートを取得する（キャッシュ優先）
 * @param yearMonth "YYYY-MM" 形式
 * @param forceRefresh true の場合は差分更新（当月のみ有効）
 */
export async function getMonthlyTweetsData(
  yearMonth: string,
  forceRefresh = false
): Promise<DayData[]>
```

**取得ロジック（フローチャート）:**

```
getMonthlyTweetsData(yearMonth, forceRefresh)
  │
  ├─ [モックモード] → モックデータを月フィルタして返す
  │
  ├─ [過去月 かつ キャッシュあり] → キャッシュから返す（API呼び出しなし）
  │
  ├─ [過去月 かつ キャッシュなし] → API全件取得 → キャッシュ保存 → 返す
  │
  ├─ [当月 かつ forceRefresh=false かつ キャッシュあり] → キャッシュから返す
  │
  ├─ [当月 かつ forceRefresh=false かつ キャッシュなし] → API全件取得 → キャッシュ保存 → 返す
  │
  └─ [当月 かつ forceRefresh=true] → 差分取得（since_id使用）→ キャッシュマージ → 返す
```

**APIリクエストパラメータ:**

| ケース | startTime | endTime | sinceId |
|--------|-----------|---------|---------|
| 過去月（初回） | `YYYY-MM-01T00:00:00Z` | `YYYY-MM-末日T23:59:59Z` | なし |
| 当月（初回） | `YYYY-MM-01T00:00:00Z` | 現在時刻-30秒 | なし |
| 当月（差分更新） | なし | 現在時刻-30秒 | キャッシュの最新tweetId |

※ いずれのケースも `EXWHYZ_SEARCH_QUERY`（`from:username (ExWHYZ OR ...)` 等）の検索条件は維持

### 3.3 `app/api/tweets/fetch/route.ts`（修正）— `sinceId` パラメータ追加

差分更新のために `sinceId` クエリパラメータを追加します。

**変更前（v3.15）:**
```ts
const startTime = searchParams.get('startTime') || undefined;
const endTime   = searchParams.get('endTime')   || undefined;
```

**変更後（v3.16）:**
```ts
const startTime = searchParams.get('startTime') || undefined;
const endTime   = searchParams.get('endTime')   || undefined;
const sinceId   = searchParams.get('sinceId')   || undefined;  // 追加
```

`sinceId` が指定された場合は `fetchUserArchiveTweets` に渡し、X API の `since_id` パラメータとして使用します。

### 3.4 `lib/twitter-api.ts`（修正）— `sinceId` パラメータ対応

**変更前（v3.15）:**
```ts
export async function fetchUserArchiveTweets(
  userId: string,
  bearerToken: string,
  startTime?: string,
  endTime?: string
): Promise<any[]>
```

**変更後（v3.16）:**
```ts
export async function fetchUserArchiveTweets(
  userId: string,
  bearerToken: string,
  startTime?: string,
  endTime?: string,
  sinceId?: string    // 追加
): Promise<any[]>
```

`sinceId` が指定された場合は `searchAll` の `since_id` オプションに渡します。

```ts
const paginator = await client.v2.searchAll(query, {
  start_time:     start,
  end_time:       end,
  since_id:       sinceId,   // 追加（undefined の場合は無視される）
  max_results:    500,
  'tweet.fields': 'created_at,text,attachments,author_id',
  'media.fields': 'url,preview_image_url',
  expansions:     'attachments.media_keys,author_id',
  'user.fields':  'username,name,profile_image_url',
});
```

### 3.5 `hooks/useMonthlyTwitterData.ts`（新規作成）— 月単位データ管理フック

```ts
export function useMonthlyTwitterData(yearMonth: string) {
  // 状態
  const [tweets, setTweets] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  // yearMonth が変わるたびにデータを取得
  useEffect(() => { loadTweets(); }, [yearMonth]);

  // 差分更新（当月のみ有効）
  const refresh = async () => { ... };

  return { tweets, loading, error, rateLimitError, lastFetchedAt, refresh };
}
```

**`yearMonth` の変更時の挙動:**
- `yearMonth` が変わると `useEffect` が発火し、新しい月のデータを取得する
- ローディング中は `loading = true` になり、UIにインジケーターが表示される

### 3.6 `components/Timeline/MonthPagination.tsx`（新規作成）— 月ナビゲーション

```tsx
interface MonthPaginationProps {
  currentYearMonth: string;           // "YYYY-MM"
  onMonthChange: (ym: string) => void;
  loading?: boolean;
  rateLimitError?: boolean;
  lastFetchedAt?: string | null;
  onRefresh?: () => void;             // 当月のみ表示
  isCurrentMonth?: boolean;
}
```

**UI仕様:**

```
┌─────────────────────────────────────────────────────────┐
│  ← 前月   [2024年 ▼] [6月 ▼]   次月 →   [🔄 更新]     │
└─────────────────────────────────────────────────────────┘
```

- **「← 前月」ボタン**: 1ヶ月前に遷移。`ARCHIVE_START_DATE` の月より前には遷移不可（disabled）
- **「次月 →」ボタン**: 1ヶ月後に遷移。未来月には遷移不可（disabled）
- **年ドロップダウン**: 選択可能な年一覧（`ARCHIVE_START_DATE` の年〜現在年）
- **月ドロップダウン**: 選択可能な月一覧（未来月はdisabled）
- **「🔄 更新」ボタン**: 当月のみ表示。差分更新を実行

### 3.7 `components/Timeline/TimelineContainer.tsx`（修正）— 月単位表示に変更

**変更前（v3.15）:**
- `userTweets: UserTweetData[]`（全期間）を受け取り、全件レンダリング
- `YearMonthNav` でスクロールジャンプ

**変更後（v3.16）:**
- `currentYearMonth: string` と `onMonthChange` を受け取る
- `useMonthlyTwitterData(currentYearMonth)` で月単位データを取得
- `MonthPagination` を上部に配置
- 選択月の日付のみ `DayEntry` でレンダリング

```tsx
interface TimelineContainerProps {
  timeline: DayData[];           // 変更なし（イベントデータ）
  categories: Category[];        // 変更なし
  // userTweets は削除（内部で useMonthlyTwitterData を使用）
  // loading は削除（内部で管理）
}
```

**月フィルタリングロジック:**
- `timeline`（イベントデータ）から選択月に該当する日付を抽出
- `useMonthlyTwitterData` から取得したツイートデータと合わせて表示
- 選択月にイベントもツイートも存在しない場合は「この月のデータはありません」を表示

### 3.8 `app/page.tsx`（修正）— `useTwitterData` から `TimelineContainer` への移行

**変更前（v3.15）:**
```tsx
const { tweets, loading, error, rateLimitError, dailyLimitError, lastFetchedAt, refresh } = useTwitterData();
// ...
<RefreshButton onRefresh={refresh} lastFetchedAt={lastFetchedAt} rateLimitError={rateLimitError} dailyLimitError={dailyLimitError} />
<TimelineContainer userTweets={tweets} loading={loading} ... />
```

**変更後（v3.16）:**
```tsx
// useTwitterData・RefreshButton は不要（TimelineContainer 内部で管理）
<TimelineContainer
  timeline={timelineData.timeline}
  categories={timelineData.categories}
/>
```

---

## 4. UI仕様

### 4.1 月ナビゲーション（MonthPagination）

| 状態 | 「← 前月」 | 「次月 →」 | 「🔄 更新」 |
|------|-----------|-----------|-----------|
| 通常（過去月） | 有効 | 有効 | 非表示 |
| 最古月（ARCHIVE_START_DATE月） | **disabled** | 有効 | 非表示 |
| 当月 | 有効 | **disabled** | 表示・有効 |
| ローディング中 | **disabled** | **disabled** | **disabled** |

### 4.2 ローディングインジケーター

月切り替え時・データ取得中は以下のUIを表示します：
- `TweetColumn` の既存スケルトンUI（`animate-pulse`）を活用
- `MonthPagination` のボタンを `disabled` にして誤操作を防ぐ
- ナビゲーション全体をローディング状態として視覚的にフィードバック

### 4.3 データなし表示

選択月にツイートもイベントも存在しない場合:
```
この月のデータはありません
```

---

## 5. IndexedDB スキーマ詳細

```
DB: exwhyz_timeline_cache (version: 1)
  └── Store: monthly_tweets
        ├── keyPath: "yearMonth"  (例: "2024-06")
        └── Record: {
              yearMonth:      string,          // "YYYY-MM"
              tweets:         DayData[],       // 日付ごとのツイート配列
              fetchedAt:      string,          // ISO 8601 最終取得日時
              isCurrent:      boolean,         // 当月フラグ（差分更新判定用）
              latestTweetId:  string | null    // 差分更新の since_id 用
            }
  └── Store: metadata
        ├── keyPath: "key"
        └── Record: { key: "lastFetchedAt", value: string }
```

---

## 6. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/idb-cache.ts` | **新規** | IndexedDB月単位キャッシュ管理 |
| `lib/data-provider-monthly.ts` | **新規** | 月単位データ取得ロジック |
| `hooks/useMonthlyTwitterData.ts` | **新規** | 月単位データ管理フック |
| `components/Timeline/MonthPagination.tsx` | **新規** | 月ナビゲーションUI |
| `lib/twitter-api.ts` | **修正** | `sinceId` パラメータ追加 |
| `app/api/tweets/fetch/route.ts` | **修正** | `sinceId` クエリパラメータ対応 |
| `components/Timeline/TimelineContainer.tsx` | **修正** | 月単位表示に変更、`MonthPagination` 統合 |
| `app/page.tsx` | **修正** | `useTwitterData`・`RefreshButton` を削除 |
| `lib/cache.ts` | **維持**（将来削除予定） | 後方互換のため残す |
| `hooks/useTwitterData.ts` | **維持**（将来削除予定） | 後方互換のため残す |
| `components/RefreshButton.tsx` | **維持**（将来削除予定） | `MonthPagination` に機能移行 |

---

## 7. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `localStorage` の既存キャッシュ | ⚠️ 移行なし | IndexedDB移行後は既存キャッシュは使用されない |
| モックモード | ✅ 問題なし | `NEXT_PUBLIC_USE_MOCK=true` 時はモックデータを月フィルタして返す |
| `EXWHYZ_SEARCH_QUERY` | ✅ 変更なし | 全APIリクエストで維持 |
| `ARCHIVE_START_DATE` | ✅ 変更なし | 月ナビの最古月制御に使用 |
| レート制限エラー処理 | ✅ 変更なし | `rateLimitError` の挙動は変更なし |

---

## 8. 実装フェーズ案

### フェーズ1: IndexedDBキャッシュ基盤
- [ ] `lib/idb-cache.ts` を新規作成

### フェーズ2: 月単位データ取得ロジック
- [ ] `lib/twitter-api.ts` に `sinceId` パラメータを追加
- [ ] `app/api/tweets/fetch/route.ts` に `sinceId` クエリパラメータを追加
- [ ] `lib/data-provider-monthly.ts` を新規作成

### フェーズ3: フック・UIコンポーネント
- [ ] `hooks/useMonthlyTwitterData.ts` を新規作成
- [ ] `components/Timeline/MonthPagination.tsx` を新規作成

### フェーズ4: 既存コンポーネントの修正
- [ ] `components/Timeline/TimelineContainer.tsx` を月単位表示に修正
- [ ] `app/page.tsx` を修正

---

## 9. 次のステップ

この変更要求書（v3.16）の内容でご承認いただけましたら、フェーズ1から順に実装を進めます。

ご確認・ご意見をお願いいたします！🎉
