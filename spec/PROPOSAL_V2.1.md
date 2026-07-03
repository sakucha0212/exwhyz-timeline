# ExWHYZ-Timeline タイムライン機能 提案書（改訂版v2.1）

## 📋 変更要件の整理

### v2.1での追加要件
- **Tweetデータの外部ファイル化**: `timeline.json`からTweetデータを分離
- **将来のX API連携への準備**: データソースの切り替えを容易にする設計

---

## 1. 新しいデータ構造の提案（v2.1）

### 設計思想

**v2.0の課題**:
- `timeline.json`に活動情報とTweetデータが混在
- X API連携時にデータソースの切り替えが複雑

**v2.1の改善**:
- **活動情報**: `data/timeline.json`（静的マスターデータ）
- **Tweetデータ**: `data/user-tweets.json`（将来的にX APIに置き換え）
- データソースの切り替えが容易

### ファイル構成

```
data/
├── timeline.json        # ExWHYZ公式活動情報（静的マスターデータ）
└── user-tweets.json     # ユーザーのTweetデータ（将来的にX APIに置き換え）
```

---

## 2. データスキーマ

### `data/timeline.json` - 活動情報のみ

```json
{
  "version": "2.1.0",
  "lastUpdated": "2026-06-25T20:45:00+09:00",
  "timeline": [
    {
      "date": "2024-05-21",
      "events": []
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
      ]
    },
    {
      "date": "2024-03-16",
      "events": []
    },
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
      ]
    },
    {
      "date": "2022-06-15",
      "events": [
        {
          "id": "evt_000",
          "title": "ExWHYZ 結成発表",
          "category": "announcement",
          "description": "新グループExWHYZの結成が発表される。",
          "officialSource": {
            "type": "official",
            "url": "https://exwhyz-official.jp/news/000"
          },
          "tags": ["結成", "発表"]
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
    "totalDays": 5,
    "dateRange": {
      "start": "2022-06-01",
      "end": "2024-12-31"
    }
  }
}
```

### `data/user-tweets.json` - Tweetデータ

```json
{
  "version": "2.1.0",
  "lastUpdated": "2026-06-25T20:45:00+09:00",
  "source": "static",
  "tweets": [
    {
      "date": "2024-05-21",
      "items": [
        {
          "tweetId": "2345678901234567890",
          "note": "1st LIVE翌日の余韻ツイート"
        },
        {
          "tweetId": "2345678901234567891",
          "note": "ライブの感想"
        }
      ]
    },
    {
      "date": "2024-03-16",
      "items": [
        {
          "tweetId": "1234567890123456789",
          "note": "ANSWERリリース日の翌日の感想"
        }
      ]
    }
  ],
  "metadata": {
    "totalTweets": 3,
    "userId": null,
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

#### ✅ データの分離
- **活動情報**: `timeline.json`（変更頻度: 低）
- **Tweetデータ**: `user-tweets.json`（変更頻度: 高、将来的にX APIに置き換え）

#### ✅ データソースの識別
- `source`: `"static"` または `"x-api"`
- 静的データとAPI取得データを区別

#### ✅ X API連携への移行容易性
- `user-tweets.json`の構造はそのまま
- データソースを`"x-api"`に変更するだけで切り替え可能
- `metadata.userId`にログインユーザーIDを保存

---

## 3. コンポーネント設計の変更

### データ読み込みの変更

#### `app/page.tsx`

```tsx
import TimelineContainer from '@/components/Timeline/TimelineContainer';
import timelineData from '@/data/timeline.json';
import userTweetsData from '@/data/user-tweets.json';

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            ExWHYZ Timeline
          </h1>
          <p className="text-gray-400 text-sm">
            輝きの軌跡 × あなたの思い出
          </p>
        </header>

        <TimelineContainer 
          timeline={timelineData.timeline} 
          categories={timelineData.categories}
          userTweets={userTweetsData.tweets}
        />
      </div>
    </main>
  );
}
```

### `TimelineContainer.tsx`の変更

```tsx
'use client';

import DayEntry from './DayEntry';

interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
}

interface Event {
  id: string;
  title: string;
  category: string;
  description: string;
  officialSource?: {
    type: string;
    url: string;
  };
  tags: string[];
}

interface Tweet {
  tweetId: string;
  note?: string;
}

interface DayData {
  date: string;
  events: Event[];
}

interface UserTweetData {
  date: string;
  items: Tweet[];
}

interface TimelineContainerProps {
  timeline: DayData[];
  categories: Category[];
  userTweets: UserTweetData[];
}

export default function TimelineContainer({ timeline, categories, userTweets }: TimelineContainerProps) {
  // Tweetデータをマップに変換（高速ルックアップ用）
  const tweetsMap = Object.fromEntries(
    userTweets.map(t => [t.date, t.items])
  );

  // 日付でソート（新しい順）
  const sortedTimeline = [...timeline].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-8">
      {sortedTimeline.map((day) => (
        <DayEntry
          key={day.date}
          date={day.date}
          events={day.events}
          tweets={tweetsMap[day.date] || []}
          categories={categories}
        />
      ))}
    </div>
  );
}
```

---

## 4. X API連携への移行パス

### フェーズ1（現在）: 静的データ

```
timeline.json (活動情報)
    ↓ 読み込み
TimelineContainer
    ↓ 結合
user-tweets.json (静的Tweetデータ)
    ↓ 表示
DayEntry → EventColumn / TweetColumn
```

### フェーズ3（将来）: X API連携

```
timeline.json (活動情報)
    ↓ 読み込み
TimelineContainer
    ↓ 結合
X API (動的Tweetデータ取得)
    ↓ 表示
DayEntry → EventColumn / TweetColumn
```

### データソース切り替えロジック

```tsx
// lib/tweets.ts
export async function getUserTweets() {
  const config = await import('@/data/user-tweets.json');
  
  if (config.source === 'static') {
    // 静的データを返す
    return config.tweets;
  } else if (config.source === 'x-api') {
    // X APIから取得
    const response = await fetch('/api/tweets');
    return await response.json();
  }
}
```

---

## 5. 実装フェーズ案（v2.1）

### フェーズ1: Tweetデータの外部ファイル化（今回）
- [ ] `data/user-tweets.json`の作成
- [ ] `timeline.json`からTweetデータを削除
- [ ] `TimelineContainer.tsx`の改修（Tweetデータのマージ処理）
- [ ] `app/page.tsx`の改修（2つのJSONファイル読み込み）
- [ ] 動作確認

### フェーズ2: インタラクション追加
- [ ] カテゴリフィルター機能
- [ ] 日付範囲検索
- [ ] 日付ジャンプ機能

### フェーズ3: X API連携
- [ ] データソース切り替えロジックの実装
- [ ] X API認証フロー（OAuth 2.0）
- [ ] 日付範囲でのポスト検索
- [ ] 取得したポストを日付ごとに自動配置
- [ ] API利用制限管理

### フェーズ4: Supabase移行
- [ ] データベーススキーマ設計
- [ ] 取得したポストのDB保存
- [ ] API利用コストの最小化

---

## 6. 変更による利点

### ✅ データ管理の明確化
- 活動情報とTweetデータが明確に分離
- それぞれ独立して管理・更新可能

### ✅ X API連携への移行容易性
- `user-tweets.json`を置き換えるだけで移行可能
- コンポーネントの変更は最小限

### ✅ 開発・テストの効率化
- Tweetデータのみを変更してテスト可能
- 活動情報の変更がTweetデータに影響しない

### ✅ 将来の拡張性
- 複数のデータソース（静的、X API、Supabase）を統一的に扱える
- データソースの切り替えが設定ファイルで完結

---

## 7. 次のステップ

この改訂版v2.1の提案内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`user-tweets.json`の作成** - Tweetデータを外部ファイル化
2. **`timeline.json`の更新** - Tweetデータを削除
3. **`TimelineContainer.tsx`の改修** - 2つのデータソースをマージ
4. **`app/page.tsx`の改修** - 2つのJSONファイルを読み込み
5. **動作確認** - デスクトップ・モバイルでの表示確認

ご確認・ご意見をお願いいたします！🎉
