# ExWHYZ-Timeline タイムライン機能 提案書（改訂版）

## 📋 概要

本提案書では、ExWHYZ-Timelineプロジェクトにおける以下の2点について具体的な設計案を提示します：

1. **JSONデータフォーマット（スキーマ）案** - ExWHYZの公式活動情報を静的に定義
2. **タイムライン画面のレイアウト構成案** - ログインユーザーのポストをX APIで取得・表示

---

## 1. JSONデータフォーマット（スキーマ）案

### 設計思想

- **ExWHYZの公式活動情報を静的に定義**: イベント・リリース等の公式情報のマスターデータ
- **X APIで取得するユーザーポストとの結合**: イベントIDと検索キーワードをキーに、ログインユーザーのポストを動的に取得・表示
- **Supabaseへの移行容易性**: テーブル構造にそのまま変換可能な正規化設計

### `data/timeline.json` スキーマ

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-06-25T19:00:00+09:00",
  "events": [
    {
      "id": "evt_001",
      "date": "2024-03-15",
      "title": "ExWHYZ 1stシングル「ANSWER」リリース",
      "category": "release",
      "description": "待望のメジャーデビューシングル。オリコン週間ランキング5位を記録。",
      "officialSource": {
        "type": "official",
        "url": "https://exwhyz-official.jp/news/001"
      },
      "searchKeywords": ["ExWHYZ", "ANSWER", "エキス"],
      "dateRange": {
        "start": "2024-03-15",
        "end": "2024-03-17"
      },
      "media": [
        {
          "type": "image",
          "url": "/images/events/evt_001_cover.jpg",
          "alt": "ANSWERジャケット写真"
        }
      ],
      "tags": ["シングル", "デビュー", "ANSWER"]
    },
    {
      "id": "evt_002",
      "date": "2024-05-20",
      "title": "初の単独ライブ「ExWHYZ 1st LIVE」開催",
      "category": "live",
      "description": "渋谷WWWにて初の単独ライブ。チケットは即完売。",
      "officialSource": {
        "type": "official",
        "url": "https://exwhyz-official.jp/live/001"
      },
      "searchKeywords": ["ExWHYZ", "1stLIVE", "渋谷WWW"],
      "dateRange": {
        "start": "2024-05-20",
        "end": "2024-05-21"
      },
      "media": [],
      "tags": ["ライブ", "渋谷", "単独公演"]
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
    "totalEvents": 2,
    "dateRange": {
      "start": "2024-03-15",
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

#### ✅ 公式活動情報の静的定義
- `id`: イベントの一意識別子（X API検索時のキーとして使用）
- `date`: イベント発生日（タイムライン表示の基準）
- `searchKeywords`: X API検索時に使用するキーワード配列
- `dateRange`: ポスト検索の対象期間（イベント前後の関連ポストを取得）

#### ✅ X APIとの動的結合設計
- **フェーズ1（初期）**: 静的なtweetIdを使って無料埋め込みで表示（モック用）
- **フェーズ2（API連携）**: ログインユーザーのポストをX APIで検索
  - 検索条件: `from:ログインユーザー名 (keyword1 OR keyword2) since:dateRange.start until:dateRange.end`
  - 取得したポストを`eventId`と紐付けて動的に表示
- **フェーズ3（DB保存）**: 取得したポストをSupabaseに保存し、API利用を最小化

#### ✅ Supabaseへの移行容易性
- `events`テーブル: id, date, title, category, description, searchKeywords, dateRange等
- `user_tweets`テーブル: tweetId, eventId（外部キー）, userId, text, postedAt等
- `categories`テーブル: id, label, color, icon
- リレーション: `events.id` ⇔ `user_tweets.eventId`（1対多）

---

## 2. タイムライン画面のレイアウト構成案

### 設計思想

- **スマホファースト**: 縦スクロール、片手操作を最優先
- **ダークモード基調**: 黒（#000000）、グレー（#1a1a1a, #2a2a2a）
- **ピンクアクセント**: #ff007f系をカテゴリアイコン、ボタン、強調要素に使用
- **エモい体験**: 公式イベント × ログインユーザーの思い出が視覚的に融合

### コンポーネント構造

```
app/
├── page.js                    # メインタイムラインページ
├── layout.js                  # 全体レイアウト（ダークモード設定）
├── globals.css                # Tailwind CSSインポート
└── api/
    └── tweets/
        └── route.js           # X API呼び出し用APIルート

components/
├── Timeline/
│   ├── TimelineContainer.jsx  # タイムライン全体のコンテナ
│   ├── EventCard.jsx          # 個別イベントカード
│   ├── TweetEmbed.jsx         # Xポスト埋め込みラッパー
│   └── CategoryBadge.jsx      # カテゴリバッジ
└── Header/
    └── SiteHeader.jsx         # サイトヘッダー

data/
└── timeline.json              # 静的タイムラインデータ（ExWHYZ公式活動情報）

public/
└── images/
    └── events/                # イベント関連画像
```

### レイアウトモックコード

#### `app/page.js`

```jsx
import TimelineContainer from '@/components/Timeline/TimelineContainer';
import timelineData from '@/data/timeline.json';

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            ExWHYZ Timeline
          </h1>
          <p className="text-gray-400 text-sm">
            輝きの軌跡 × あなたの思い出
          </p>
        </header>

        {/* タイムライン */}
        <TimelineContainer events={timelineData.events} categories={timelineData.categories} />
      </div>
    </main>
  );
}
```

#### `components/Timeline/TimelineContainer.jsx`

```jsx
'use client';

import { useState, useEffect } from 'react';
import EventCard from './EventCard';

export default function TimelineContainer({ events, categories }) {
  const [userTweetsMap, setUserTweetsMap] = useState({});
  
  // カテゴリマップを作成（高速ルックアップ用）
  const categoryMap = Object.fromEntries(
    categories.map(cat => [cat.id, cat])
  );

  // 日付でソート（新しい順）
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  // フェーズ2以降: X APIでユーザーのポストを取得
  useEffect(() => {
    // TODO: ログイン状態の確認
    // TODO: 各イベントのsearchKeywordsとdateRangeを使ってX APIで検索
    // TODO: 取得したポストをeventIdごとにマッピング
  }, [events]);

  return (
    <div className="space-y-8">
      {sortedEvents.map((event) => (
        <EventCard 
          key={event.id} 
          event={event} 
          category={categoryMap[event.category]}
          userTweets={userTweetsMap[event.id] || []}
        />
      ))}
    </div>
  );
}
```

#### `components/Timeline/EventCard.jsx`

```jsx
import CategoryBadge from './CategoryBadge';
import TweetEmbed from './TweetEmbed';

export default function EventCard({ event, category, userTweets = [] }) {
  return (
    <article className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-pink-500 transition-colors">
      {/* イベントヘッダー */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-start justify-between mb-3">
          <time className="text-sm text-gray-500 font-mono">
            {event.date}
          </time>
          <CategoryBadge category={category} />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3">
          {event.title}
        </h2>
        
        <p className="text-gray-300 leading-relaxed">
          {event.description}
        </p>

        {/* 公式ソースリンク */}
        {event.officialSource && (
          <a 
            href={event.officialSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-4 text-sm text-pink-400 hover:text-pink-300 transition-colors"
          >
            <span>公式情報を見る</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* あなたの思い出セクション（X APIから取得したユーザーのポスト） */}
      {userTweets.length > 0 && (
        <div className="p-6 bg-gray-950">
          <h3 className="text-sm font-semibold text-pink-400 mb-4 flex items-center">
            <span className="mr-2">💭</span>
            あなたの思い出
          </h3>
          <div className="space-y-4">
            {userTweets.map((tweet) => (
              <TweetEmbed key={tweet.tweetId} tweetId={tweet.tweetId} />
            ))}
          </div>
        </div>
      )}

      {/* ポストが見つからない場合のメッセージ */}
      {userTweets.length === 0 && (
        <div className="p-6 bg-gray-950 text-center">
          <p className="text-gray-500 text-sm">
            この日の思い出ポストはまだありません
          </p>
        </div>
      )}
    </article>
  );
}
```

#### `components/Timeline/CategoryBadge.jsx`

```jsx
export default function CategoryBadge({ category }) {
  if (!category) return null;

  return (
    <span 
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
      style={{ 
        backgroundColor: `${category.color}20`,
        color: category.color,
        border: `1px solid ${category.color}40`
      }}
    >
      <span className="mr-1">{category.icon}</span>
      {category.label}
    </span>
  );
}
```

#### `components/Timeline/TweetEmbed.jsx`

```jsx
'use client';

import { TwitterTweetEmbed } from 'react-twitter-embed';

export default function TweetEmbed({ tweetId }) {
  return (
    <div className="rounded-lg overflow-hidden">
      <TwitterTweetEmbed
        tweetId={tweetId}
        options={{
          theme: 'dark',
          width: '100%',
          conversation: 'none',
          cards: 'hidden'
        }}
      />
    </div>
  );
}
```

### Tailwind CSS カラーパレット方針

```js
// tailwind.config.js での拡張例
module.exports = {
  theme: {
    extend: {
      colors: {
        'exwhyz-pink': {
          DEFAULT: '#ff007f',
          light: '#ff4da6',
          lighter: '#ff80bf',
          lightest: '#ffb3d9',
        },
        'dark': {
          DEFAULT: '#000000',
          800: '#1a1a1a',
          700: '#2a2a2a',
          600: '#3a3a3a',
        }
      }
    }
  }
}
```

### レスポンシブ対応

- **モバイル（デフォルト）**: 1カラム、フルワイドカード
- **タブレット（md:）**: max-w-2xl、余白調整
- **デスクトップ（lg:）**: max-w-4xl、2カラムレイアウト（将来的に）

### スクロール体験の最適化

- `scroll-smooth`: スムーズスクロール有効化
- カード間の適切な余白（space-y-8）
- ホバーエフェクトで視覚的フィードバック
- 画像の遅延読み込み（next/imageを使用）

---

## 3. 実装フェーズ案

### フェーズ1: 基本タイムライン表示（今回）
- [ ] Next.jsプロジェクトのセットアップ
- [ ] `data/timeline.json`の作成（ExWHYZ公式活動情報）
- [ ] タイムラインコンポーネントの実装
- [ ] react-twitter-embedの統合（モック用の静的tweetId表示）
- [ ] スマホでの動作確認

### フェーズ2: インタラクション追加
- [ ] カテゴリフィルター機能
- [ ] 日付範囲検索
- [ ] スムーズスクロールアニメーション

### フェーズ3: X API連携（ログインユーザーのポスト取得）
- [ ] X API認証フロー（OAuth 2.0）
- [ ] ログインユーザーのポスト検索機能
  - `searchKeywords`と`dateRange`を使った検索クエリ生成
  - イベントIDとポストの紐付け
- [ ] API利用制限管理（quotaLimit監視）
- [ ] 取得したポストの動的表示

### フェーズ4: Supabase移行
- [ ] データベーススキーマ設計
- [ ] JSONからDBへのマイグレーション
- [ ] 取得したポストのDB保存（API利用最小化）
- [ ] CRUD操作の実装

---

## 4. 技術的な補足事項

### react-twitter-embedの使用

```bash
npm install react-twitter-embed
```

- **利点**: 無料、公式埋め込みウィジェット使用、X利用規約準拠
- **制約**: 初回読み込みに若干時間がかかる（ネットワーク依存）
- **対策**: ローディング状態の表示、Suspenseでのラップ

### X API連携の設計（フェーズ3以降）

#### データフロー
1. **ユーザー認証**: X OAuth 2.0でログイン
2. **イベント読み込み**: `timeline.json`から公式活動情報を取得
3. **ポスト検索**: 各イベントの`searchKeywords`と`dateRange`を使ってX APIで検索
   ```
   GET /2/tweets/search/recent
   query: from:{username} ({keyword1} OR {keyword2}) since:{start} until:{end}
   ```
4. **結合表示**: 取得したポストを`eventId`と紐付けてタイムラインに表示
5. **キャッシュ**: 取得したポストをSupabaseに保存し、次回以降はDBから読み込み

#### API利用制限の管理
- `metadata.apiUsage.quotaLimit`: 月間利用上限
- `metadata.apiUsage.quotaUsed`: 現在の利用量
- 上限到達時は新規検索を停止し、DB保存済みデータのみ表示

### Next.js App Routerでの注意点

- `'use client'`ディレクティブ: react-twitter-embedは必須
- Server Componentsでのデータ読み込み: `timeline.json`は`page.js`で読み込み
- 動的インポート: 必要に応じて`next/dynamic`で遅延読み込み
- API Route: X API呼び出しは`app/api/tweets/route.js`で実装（環境変数でキー管理）

### パフォーマンス最適化

- JSONファイルサイズ: 初期は小さいが、将来的にページネーション検討
- 画像最適化: `next/image`でWebP変換、レスポンシブ対応
- コード分割: コンポーネント単位で適切に分割

---

## 5. 次のステップ

この提案内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **Next.jsプロジェクトのセットアップ**
2. **ディレクトリ構造の作成**
3. **`data/timeline.json`のサンプルデータ作成**（ExWHYZ公式活動情報）
4. **コンポーネントの実装**
5. **ローカル環境での動作確認**
6. **スマホ表示の最適化**

### 重要な変更点（フィードバック反映）

✅ **JSONデータの役割を明確化**
- JSONファイルは「ExWHYZの公式活動情報」のみを静的に定義
- ユーザーのポストデータは含まず、X APIで動的に取得

✅ **X API連携の設計を追加**
- `searchKeywords`と`dateRange`を使った検索クエリ設計
- ログインユーザーのポストを動的に取得・表示する仕組み

✅ **コンポーネント設計の調整**
- `EventCard`に`userTweets`プロップを追加
- `TweetEmbed`は`tweetId`のみを受け取るシンプルな設計

ご確認・ご意見をお願いいたします！🎉
