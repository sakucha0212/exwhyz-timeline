# ExWHYZ-Timeline ツイート読み込み中のローディング表示 変更要求書（v3.9）

## 📋 変更要件の整理

### v3.9での変更要件

- **ツイートを読み込んでいる間、ツイートカラムにローディング表示を出す**:  
  現状、ツイートデータの読み込み中はページ全体が「データを読み込んでいます...」という全画面テキスト表示になっており、  
  ログイン後に何も表示されないように見えてしまう。  
  ページ全体をブロックするのをやめ、タイムライン（活動情報）は先に表示しつつ、  
  ツイートカラムのみにローディング中であることがわかるスケルトン UI を表示する。

---

## 1. 変更の背景と目的

### 現状の課題

| 課題 | 詳細 |
|------|------|
| ページ全体がブロックされる | `loading === true` の間、ヘッダーもタイムラインも一切表示されず、全画面に「データを読み込んでいます...」とだけ表示される |
| ログイン後に何も表示されないように見える | ツイートデータの取得には時間がかかるため、ユーザーはログイン後しばらく何も見えない状態になる |
| 活動情報（`timeline.json`）は即座に表示できる | 活動情報はローカルの JSON ファイルから読み込むため、ツイートの取得を待つ必要がない |

### 変更の目的

- **活動情報を即座に表示する**: ツイートの読み込みを待たずに、タイムラインの活動情報カラムを先に表示する
- **ツイートカラムにローディング表示を出す**: ツイートが読み込まれるまでの間、スケルトン UI でロード中であることを明示する
- **ユーザー体験を向上させる**: ログイン後すぐにコンテンツが見え、読み込み中であることが直感的にわかるようにする

---

## 2. UI設計

### 2.1 変更前（v3.8）

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│              データを読み込んでいます...                   │  ← 全画面。何も見えない
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.2 変更後（v3.9）

```
┌──────────────────────────────────────────────────────────┐
│              ExWHYZ Timeline                             │  ← ヘッダーは即表示
│          輝きの軌跡 × あなたの思い出                       │
│          [最新のポストを取得]                              │
├──────────────────────────────────────────────────────────┤
│  📅 ジャンプ: [年 ▼] [月 ▼]   ☑ 空日を非表示             │
├──────────────────────────────────────────────────────────┤
│  📅 2026年8月31日（月）                                   │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │  🎯 活動情報      │  │  💭 あなたのTweet  │             │
│  │  （即表示）       │  │  ┌────────────┐   │             │
│  │                  │  │  │ ░░░░░░░░░░ │   │  ← スケルトン
│  │                  │  │  │ ░░░░░░░░░░ │   │    (animate-pulse)
│  │                  │  │  │ ░░░░░░░░   │   │
│  │                  │  │  └────────────┘   │
│  └──────────────────┘  └──────────────────┘             │
└──────────────────────────────────────────────────────────┘
```

### 2.3 ツイートカラムのスケルトン UI

- `animate-pulse` を使ったグレーのスケルトンカードを表示
- スケルトンカードは 2 枚表示（ツイートが複数ある日を想定）
- ローディング中は「この日はTweetがありません」の表示を出さない

```
┌──────────────────────────────────┐
│  💭 あなたのTweet                 │
│  ┌────────────────────────────┐  │
│  │  ████████████████          │  │  ← animate-pulse
│  │  ████████████████████████  │  │
│  │  ████████████              │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │  ████████████████          │  │  ← 2枚目
│  │  ████████████████████████  │  │
│  │  ████████████              │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

---

## 3. 変更対象ファイルと変更内容

### 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `app/page.tsx` | **修正** | `loading` 中の全画面ブロックを削除。`loading` を `TimelineContainer` に渡す |
| `components/Timeline/TimelineContainer.tsx` | **修正** | `loading` prop を受け取り、`DayEntry` に渡す |
| `components/Timeline/DayEntry.tsx` | **修正** | `loading` prop を受け取り、`TweetColumn` に渡す |
| `components/Timeline/TweetColumn.tsx` | **修正** | `loading` prop を受け取り、ローディング中はスケルトン UI を表示 |

---

## 4. 変更詳細

### 4.1 `app/page.tsx` の変更

#### 変更前（v3.8）

```typescript
// データ読み込み中
if (loading) {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">データを読み込んでいます...</div>
    </main>
  );
}

// ...

return (
  <main className="min-h-screen bg-black">
    {/* ... */}
    <TimelineContainer 
      timeline={timelineData.timeline} 
      categories={timelineData.categories}
      userTweets={tweets}
    />
  </main>
);
```

#### 変更後（v3.9）

```typescript
// データ読み込み中の全画面ブロックを削除

// ...

return (
  <main className="min-h-screen bg-black">
    {/* ... */}
    <TimelineContainer 
      timeline={timelineData.timeline} 
      categories={timelineData.categories}
      userTweets={tweets}
      loading={loading}        {/* ← 追加 */}
    />
  </main>
);
```

**変更点のまとめ:**
- `loading` 中の全画面ブロック（`if (loading) { return ... }`）を削除
- `TimelineContainer` に `loading={loading}` prop を追加

---

### 4.2 `components/Timeline/TimelineContainer.tsx` の変更

#### 変更前（v3.8）

```typescript
interface TimelineContainerProps {
  timeline: DayData[];
  categories: Category[];
  userTweets: UserTweetData[];
}

export default function TimelineContainer({ timeline, categories, userTweets }: TimelineContainerProps) {
  // ...
  return (
    <>
      <YearMonthNav ... />
      <div className="space-y-8 mt-4">
        {displayDates.map((date) => (
          <DayEntry
            key={date}
            id={`date-${date}`}
            date={date}
            events={getEventsForDate(date)}
            tweets={getTweetsForDate(date)}
            categories={categories}
          />
        ))}
      </div>
    </>
  );
}
```

#### 変更後（v3.9）

```typescript
interface TimelineContainerProps {
  timeline: DayData[];
  categories: Category[];
  userTweets: UserTweetData[];
  loading?: boolean;           // ← 追加
}

export default function TimelineContainer({ timeline, categories, userTweets, loading = false }: TimelineContainerProps) {
  // ...
  return (
    <>
      <YearMonthNav ... />
      <div className="space-y-8 mt-4">
        {displayDates.map((date) => (
          <DayEntry
            key={date}
            id={`date-${date}`}
            date={date}
            events={getEventsForDate(date)}
            tweets={getTweetsForDate(date)}
            categories={categories}
            loading={loading}  {/* ← 追加 */}
          />
        ))}
      </div>
    </>
  );
}
```

**変更点のまとめ:**
- `TimelineContainerProps` に `loading?: boolean` を追加（デフォルト `false`）
- 各 `DayEntry` に `loading={loading}` を渡す

---

### 4.3 `components/Timeline/DayEntry.tsx` の変更

#### 変更前（v3.8）

```typescript
interface DayEntryProps {
  id?: string;
  date: string;
  events: Event[];
  tweets: Tweet[];
  categories: Category[];
}

export default function DayEntry({ id, date, events, tweets, categories }: DayEntryProps) {
  // ...
  return (
    <div id={id} className="mb-8">
      {/* ... */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EventColumn events={events} categories={categories} />
        <TweetColumn tweets={tweets} />
      </div>
    </div>
  );
}
```

#### 変更後（v3.9）

```typescript
interface DayEntryProps {
  id?: string;
  date: string;
  events: Event[];
  tweets: Tweet[];
  categories: Category[];
  loading?: boolean;           // ← 追加
}

export default function DayEntry({ id, date, events, tweets, categories, loading = false }: DayEntryProps) {
  // ...
  return (
    <div id={id} className="mb-8">
      {/* ... */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EventColumn events={events} categories={categories} />
        <TweetColumn tweets={tweets} loading={loading} />  {/* ← loading 追加 */}
      </div>
    </div>
  );
}
```

**変更点のまとめ:**
- `DayEntryProps` に `loading?: boolean` を追加（デフォルト `false`）
- `TweetColumn` に `loading={loading}` を渡す

---

### 4.4 `components/Timeline/TweetColumn.tsx` の変更

#### 変更前（v3.8）

```typescript
interface TweetColumnProps {
  tweets: Tweet[];
}

export default function TweetColumn({ tweets }: TweetColumnProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
        <span className="mr-2">💭</span>
        あなたのTweet
      </h3>
      {tweets.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <p className="text-gray-600 text-sm">この日はTweetがありません</p>
        </div>
      ) : (
        tweets.map((tweet, index) => (
          <div key={`${tweet.tweetId}-${index}`} className="space-y-2">
            {tweet.note && (
              <p className="text-gray-400 text-xs italic">{tweet.note}</p>
            )}
            <TweetEmbed tweetId={tweet.tweetId} />
          </div>
        ))
      )}
    </div>
  );
}
```

#### 変更後（v3.9）

```typescript
interface TweetColumnProps {
  tweets: Tweet[];
  loading?: boolean;           // ← 追加
}

export default function TweetColumn({ tweets, loading = false }: TweetColumnProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
        <span className="mr-2">💭</span>
        あなたのTweet
      </h3>

      {/* ローディング中: スケルトン UI を表示 */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[0, 1].map((i) => (
            <div key={i} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="h-3 bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-700 rounded w-full mb-2" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : tweets.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <p className="text-gray-600 text-sm">この日はTweetがありません</p>
        </div>
      ) : (
        tweets.map((tweet, index) => (
          <div key={`${tweet.tweetId}-${index}`} className="space-y-2">
            {tweet.note && (
              <p className="text-gray-400 text-xs italic">{tweet.note}</p>
            )}
            <TweetEmbed tweetId={tweet.tweetId} />
          </div>
        ))
      )}
    </div>
  );
}
```

**変更点のまとめ:**
- `TweetColumnProps` に `loading?: boolean` を追加（デフォルト `false`）
- `loading` が `true` の場合、スケルトン UI（`animate-pulse` + グレーのブロック 2 枚）を表示
- `loading` が `false` の場合は従来通りの表示（ツイートなし表示 or ツイート一覧）

---

## 5. 処理の流れ（v3.9）

```
1. ページ表示
   ├─ ヘッダー・タイムライン（活動情報）を即座に表示
   └─ loading = true のため、ツイートカラムはスケルトン UI を表示

2. useTwitterData() がバックグラウンドでツイートを取得
   ├─ キャッシュあり: 即座に tweets が設定され loading = false になる
   └─ キャッシュなし: X API からの取得完了後に loading = false になる

3. loading = false になると
   └─ ツイートカラムがスケルトン UI からツイート一覧（またはなし表示）に切り替わる
```

---

## 6. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `TimelineContainer` の props | ✅ 後方互換 | `loading` はオプショナル（デフォルト `false`）のため既存の呼び出しに影響なし |
| `DayEntry` の props | ✅ 後方互換 | `loading` はオプショナル（デフォルト `false`）のため既存の呼び出しに影響なし |
| `TweetColumn` の props | ✅ 後方互換 | `loading` はオプショナル（デフォルト `false`）のため既存の呼び出しに影響なし |
| モックモード (`NEXT_PUBLIC_USE_MOCK=true`) | ✅ 維持 | モックモードでは `getTweetsData()` が即座に返るため、スケルトンはほぼ表示されない |
| X API連携・キャッシュ機構 | ✅ 変更なし | フロントエンドのみの変更 |

---

## 7. 実装フェーズ案

### フェーズ1: `components/Timeline/TweetColumn.tsx` の修正
- [ ] `loading?: boolean` prop を追加
- [ ] `loading` が `true` の場合のスケルトン UI を実装

### フェーズ2: `components/Timeline/DayEntry.tsx` の修正
- [ ] `loading?: boolean` prop を追加
- [ ] `TweetColumn` に `loading={loading}` を渡す

### フェーズ3: `components/Timeline/TimelineContainer.tsx` の修正
- [ ] `loading?: boolean` prop を追加
- [ ] 各 `DayEntry` に `loading={loading}` を渡す

### フェーズ4: `app/page.tsx` の修正
- [ ] `loading` 中の全画面ブロック（`if (loading) { return ... }`）を削除
- [ ] `TimelineContainer` に `loading={loading}` を渡す

### フェーズ5: 動作確認
- [ ] ページ表示直後にヘッダーとタイムライン（活動情報）が表示されるか確認
- [ ] ツイートカラムにスケルトン UI が表示されるか確認
- [ ] ツイート取得完了後にスケルトンがツイート一覧に切り替わるか確認
- [ ] キャッシュあり時（2回目以降のアクセス）にスケルトンがほぼ表示されないか確認
- [ ] モバイル表示での動作確認

---

## 8. 次のステップ

この変更要求書（v3.9）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`components/Timeline/TweetColumn.tsx` の修正** — スケルトン UI の実装
2. **`components/Timeline/DayEntry.tsx` の修正** — `loading` prop の追加と伝播
3. **`components/Timeline/TimelineContainer.tsx` の修正** — `loading` prop の追加と伝播
4. **`app/page.tsx` の修正** — 全画面ブロックの削除と `loading` prop の追加
5. **動作確認** — ローディング表示の動作確認

ご確認・ご意見をお願いいたします！🎉
