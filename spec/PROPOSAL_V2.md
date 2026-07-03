# ExWHYZ-Timeline タイムライン機能 提案書（改訂版v2）

## 📋 変更要件の整理

### ユーザーからのフィードバック
1. **活動情報とTweetの関係性の見直し**
   - 現状: 活動情報にTweetが直接紐づく形
   - 問題: Tweetは活動の翌日など、活動日とは異なる日付に投稿される
   - 要望: カレンダーの日付を基準に、活動情報とTweetを独立して紐づける

2. **画面レイアウトの変更**
   - 現状: 縦スクロールで活動情報カードが並び、その下にTweetが表示
   - 要望: カレンダーの日付が上から下に新しくなり、左側に活動情報、右側にTweet情報を表示

---

## 1. 新しいデータ構造の提案

### 設計思想の変更

**旧設計**: イベント中心のデータ構造
- イベントにTweetが紐づく
- イベント発生日を基準にタイムライン表示

**新設計**: 日付中心のデータ構造
- カレンダーの日付を基準
- 各日付に「活動情報」と「Tweet情報」が独立して紐づく
- 活動がない日でもTweetがあれば表示可能

### `data/timeline.json` 新スキーマ

```json
{
  "version": "2.0.0",
  "lastUpdated": "2026-06-25T20:30:00+09:00",
  "timeline": [
    {
      "date": "2024-03-15",
      "events": [
        {
          "id": "evt_001",
          "title": "ExWHYZ 1stシングル「ANSWER」リリース",
          "category": "release",
          "description": "待望のメジャーデビューシングル。オリコン週間ランキング5位を記録。",
          "officialSource": {
            "type": "official",
            "url": "https://exwhyz-official.jp/news/001"
          },
          "tags": ["シングル", "デビュー", "ANSWER"]
        }
      ],
      "tweets": []
    },
    {
      "date": "2024-03-16",
      "events": [],
      "tweets": [
        {
          "tweetId": "1234567890123456789",
          "note": "ANSWERリリース日の翌日の感想"
        }
      ]
    },
    {
      "date": "2024-05-20",
      "events": [
        {
          "id": "evt_002",
          "title": "初の単独ライブ「ExWHYZ 1st LIVE」開催",
          "category": "live",
          "description": "渋谷WWWにて初の単独ライブ。チケットは即完売。",
          "officialSource": {
            "type": "official",
            "url": "https://exwhyz-official.jp/live/001"
          },
          "tags": ["ライブ", "渋谷", "単独公演"]
        }
      ],
      "tweets": []
    },
    {
      "date": "2024-05-21",
      "events": [],
      "tweets": [
        {
          "tweetId": "2345678901234567890",
          "note": "1st LIVE翌日の余韻ツイート"
        },
        {
          "tweetId": "2345678901234567891",
          "note": "ライブの感想"
        }
      ]
    }
  ],
  "categories": [
    {
      "id": "release",
      "label": "リリース",
      "color": "#ff007f",
      "icon": "🎵"
    },
    {
      "id": "live",
      "label": "ライブ",
      "color": "#ff4da6",
      "icon": "🎤"
    },
    {
      "id": "media",
      "label": "メディア出演",
      "color": "#ff80bf",
      "icon": "📺"
    },
    {
      "id": "announcement",
      "label": "発表・お知らせ",
      "color": "#ffb3d9",
      "icon": "📢"
    }
  ],
  "metadata": {
    "totalDays": 4,
    "dateRange": {
      "start": "2022-06-01",
      "end": "2024-12-31"
    },
    "apiUsage": {
      "enabled": false,
      "quotaLimit": 10000,
      "quotaUsed": 0,
      "lastFetchedAt": null
    }
  }
}
```

### スキーマの特徴

#### ✅ 日付中心の設計
- `timeline`: 日付ごとのエントリー配列
- `date`: カレンダーの日付（YYYY-MM-DD形式）
- `events`: その日に発生した活動情報の配列（空配列も可）
- `tweets`: その日に投稿されたTweetの配列（空配列も可）

#### ✅ 柔軟な紐づけ
- 活動情報とTweetは独立して管理
- 活動がない日でもTweetのみ表示可能
- Tweetがない日でも活動情報のみ表示可能
- 同じ日に複数の活動情報と複数のTweetが共存可能

#### ✅ X API連携への対応
- **フェーズ1（現在）**: 静的なtweetIdを手動で記述
- **フェーズ2（API連携）**: 日付範囲でユーザーのポストを検索
  - 検索条件: `from:ログインユーザー名 since:date until:date+1day`
  - 取得したポストを該当日付に自動配置
- **フェーズ3（DB保存）**: Supabaseに保存してAPI利用を最小化

---

## 2. 新しい画面レイアウトの提案

### 設計思想

- **日付軸の縦スクロール**: 上から下に日付が新しくなる
- **2カラムレイアウト**: 左側に活動情報、右側にTweet情報
- **スマホ対応**: モバイルでは1カラムに切り替え（活動情報 → Tweet情報の順）
- **視覚的な日付区切り**: 日付ヘッダーで明確に区切る

### レイアウトモックコード

#### 画面構成イメージ

```
┌─────────────────────────────────────────────┐
│           ExWHYZ Timeline                   │
│      輝きの軌跡 × あなたの思い出              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  📅 2024年5月21日（火）                      │
├──────────────────┬──────────────────────────┤
│  活動情報         │  あなたのTweet           │
│  （なし）         │  💭 1st LIVE翌日の余韻   │
│                  │  [Tweet埋め込み]         │
│                  │  💭 ライブの感想          │
│                  │  [Tweet埋め込み]         │
└──────────────────┴──────────────────────────┘

┌─────────────────────────────────────────────┐
│  📅 2024年5月20日（月）                      │
├──────────────────┬──────────────────────────┤
│  🎤 ライブ        │  あなたのTweet           │
│  初の単独ライブ   │  （なし）                │
│  「ExWHYZ 1st    │                          │
│  LIVE」開催      │                          │
│  [詳細を見る]    │                          │
└──────────────────┴──────────────────────────┘

┌─────────────────────────────────────────────┐
│  📅 2024年3月16日（土）                      │
├──────────────────┬──────────────────────────┤
│  活動情報         │  あなたのTweet           │
│  （なし）         │  💭 ANSWERリリース翌日   │
│                  │  [Tweet埋め込み]         │
└──────────────────┴──────────────────────────┘

┌─────────────────────────────────────────────┐
│  📅 2024年3月15日（金）                      │
├──────────────────┬──────────────────────────┤
│  🎵 リリース      │  あなたのTweet           │
│  ExWHYZ 1st      │  （なし）                │
│  シングル        │                          │
│  「ANSWER」      │                          │
│  リリース        │                          │
│  [詳細を見る]    │                          │
└──────────────────┴──────────────────────────┘
```

### コンポーネント構造（改訂版）

```
app/
├── page.tsx                    # メインタイムラインページ
├── layout.tsx                  # 全体レイアウト
└── globals.css                 # グローバルスタイル

components/
├── Timeline/
│   ├── TimelineContainer.tsx   # タイムライン全体のコンテナ
│   ├── DayEntry.tsx           # 日付ごとのエントリー（NEW）
│   ├── EventColumn.tsx        # 活動情報カラム（NEW）
│   ├── TweetColumn.tsx        # Tweetカラム（NEW）
│   ├── EventCard.tsx          # 個別活動情報カード（簡略化）
│   ├── TweetEmbed.tsx         # Xポスト埋め込み
│   └── CategoryBadge.tsx      # カテゴリバッジ
└── Header/
    └── SiteHeader.tsx         # サイトヘッダー

data/
└── timeline.json              # 日付中心のタイムラインデータ
```

### 主要コンポーネントの役割

#### `DayEntry.tsx` - 日付ごとのエントリー
```tsx
interface DayEntryProps {
  date: string;
  events: Event[];
  tweets: Tweet[];
  categories: Category[];
}

// 日付ヘッダー + 2カラムレイアウト（活動情報 | Tweet）
// モバイルでは1カラムに切り替え
```

#### `EventColumn.tsx` - 活動情報カラム
```tsx
interface EventColumnProps {
  events: Event[];
  categories: Category[];
}

// 活動情報がない場合は「活動情報なし」と表示
// 複数の活動情報がある場合は縦に並べる
```

#### `TweetColumn.tsx` - Tweetカラム
```tsx
interface TweetColumnProps {
  tweets: Tweet[];
}

// Tweetがない場合は「この日のTweetはありません」と表示
// 複数のTweetがある場合は縦に並べる
```

### レスポンシブ対応

#### デスクトップ（lg:以上）
```css
.day-entry {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 左右50%ずつ */
  gap: 1rem;
}
```

#### タブレット（md:）
```css
.day-entry {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
```

#### モバイル（デフォルト）
```css
.day-entry {
  display: flex;
  flex-direction: column; /* 縦並び */
  gap: 1rem;
}
```

---

## 3. 実装フェーズ案（改訂版）

### フェーズ1: 日付中心のタイムライン表示（今回の変更）
- [ ] `data/timeline.json`のスキーマ変更（日付中心の構造）
- [ ] `DayEntry.tsx`コンポーネントの新規作成
- [ ] `EventColumn.tsx`コンポーネントの新規作成
- [ ] `TweetColumn.tsx`コンポーネントの新規作成
- [ ] `EventCard.tsx`の簡略化（活動情報のみ表示）
- [ ] `TimelineContainer.tsx`の改修（日付ごとのループ）
- [ ] レスポンシブ対応（2カラム ⇔ 1カラム）
- [ ] スマホでの動作確認

### フェーズ2: インタラクション追加
- [ ] カテゴリフィルター機能
- [ ] 日付範囲検索
- [ ] 日付ジャンプ機能

### フェーズ3: X API連携
- [ ] X API認証フロー（OAuth 2.0）
- [ ] 日付範囲でのポスト検索
- [ ] 取得したポストを日付ごとに自動配置
- [ ] API利用制限管理

### フェーズ4: Supabase移行
- [ ] データベーススキーマ設計（日付テーブル中心）
- [ ] JSONからDBへのマイグレーション
- [ ] ポストデータのキャッシュ保存

---

## 4. 技術的な補足事項

### データ構造の変更点

#### 旧構造（イベント中心）
```json
{
  "events": [
    {
      "id": "evt_001",
      "date": "2024-03-15",
      "relatedTweets": [...]
    }
  ]
}
```

#### 新構造（日付中心）
```json
{
  "timeline": [
    {
      "date": "2024-03-15",
      "events": [...],
      "tweets": [...]
    }
  ]
}
```

### X API連携の変更点

#### 旧設計
- イベントの`searchKeywords`と`dateRange`で検索
- イベントに紐づけて表示

#### 新設計
- 日付範囲で全ポストを取得
- 投稿日時に基づいて該当日付に自動配置
- より自然な「その日の思い出」表示

### Supabaseスキーマ（将来）

```sql
-- 日付マスター
CREATE TABLE timeline_days (
  date DATE PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 活動情報
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  date DATE REFERENCES timeline_days(date),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  official_source_url TEXT,
  tags TEXT[]
);

-- ユーザーのTweet
CREATE TABLE user_tweets (
  tweet_id TEXT PRIMARY KEY,
  date DATE REFERENCES timeline_days(date),
  user_id TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. 変更による利点

### ✅ より自然なユーザー体験
- 「その日何があったか」が一目でわかる
- 活動日とTweet日のズレを自然に表現
- カレンダー感覚で振り返れる

### ✅ データ管理の柔軟性
- 活動情報とTweetを独立して管理
- 後からTweetを追加しやすい
- 活動がない日の思い出も記録可能

### ✅ X API連携の効率化
- 日付範囲での一括取得が可能
- 検索クエリがシンプルになる
- API利用回数を削減できる

---

## 6. 次のステップ

この改訂版の提案内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **データ構造の変更** - `timeline.json`を日付中心の構造に変更
2. **新規コンポーネントの作成** - `DayEntry`, `EventColumn`, `TweetColumn`
3. **既存コンポーネントの改修** - `TimelineContainer`, `EventCard`
4. **レイアウトの実装** - 2カラムレイアウト + レスポンシブ対応
5. **動作確認** - デスクトップ・タブレット・スマホでの表示確認

ご確認・ご意見をお願いいたします！🎉
