# ExWHYZ-Timeline タイムライン機能 提案書（改訂版v2.2）

## 📋 変更要件の整理

### v2.2での追加要件
- **Tweetの表示範囲の変更**: 活動情報の日付の前後2日間のTweetを表示
- **より自然な思い出の表示**: 活動前の期待感、活動当日、活動後の余韻を一緒に表示

---

## 1. 新しい表示ロジックの提案（v2.2）

### 設計思想

**v2.1の課題**:
- 日付ごとに完全に独立した表示
- 活動日とTweet日が一致しない場合、関連性が見えにくい

**v2.2の改善**:
- **日付は活動情報が存在する日付を基準前として表示する**
- 活動前の期待感、当日の興奮、翌日の余韻を表示する
- より自然な「思い出の流れ」を表現

### 表示ロジック

#### 例: 2024年5月20日にライブがあった場合

```AA
┌─────────────────────────────────────────────┐
│  📅 2024年5月18日（日）                      │
├──────────────────┬──────────────────────────┤
│                  │  あなたのTweet           │
│                  │  ・5月18日のTweet        │
│                  │    「明後日ライブ！」          │
└──────────────────┴──────────────────────────┘
┌─────────────────────────────────────────────┐
│  📅 2024年5月19日（日）                      │
├──────────────────┬──────────────────────────┤
│                  │  あなたのTweet           │
│                  │  ・5月19日のTweet        │
│                  │    「明日だ！」          │
└──────────────────┴──────────────────────────┘
┌─────────────────────────────────────────────┐
│  📅 2024年5月20日（月）                      │
├──────────────────┬──────────────────────────┤
│  🎤 ライブ        │  あなたのTweet           │
│  初の単独ライブ   │  ・5月20日のTweet        │
│  「ExWHYZ 1st    │     「最高だった！」      │
│  LIVE」開催      │                           │
└──────────────────┴──────────────────────────┘
┌─────────────────────────────────────────────┐
│  📅 2024年5月21日（火）                      │
├──────────────────┬──────────────────────────┤
│                  │  あなたのTweet           │
│                  │  ・5月21日のTweet        │
│                  │    「余韻が...」         │
└──────────────────┴──────────────────────────┘
┌─────────────────────────────────────────────┐
│  📅 2024年5月22日（水）                      │
├──────────────────┬──────────────────────────┤
│                  │  あなたのTweet           │
│                  │  ・5月22日のTweet        │
│                  │    「まだ興奮」         │
└──────────────────┴──────────────────────────┘
```

#### 表示範囲の計算

```
活動情報が存在する日付：2024-05-20

表示する見出し日付の範囲:
- 開始日: 2024-05-18（活動情報が存在する日付 - 2日）
- 終了日: 2024-05-22（活動情報が日付 + 2日）
```

---

## 2. データ構造（v2.2）

### ファイル構成（変更なし）

```
data/
├── timeline.json        # ExWHYZ公式活動情報（静的マスターデータ）
└── user-tweets.json     # ユーザーのTweetデータ
```

### `data/timeline.json` - 活動情報（変更なし）

```json
{
  "version": "2.2.0",
  "lastUpdated": "2026-06-25T21:00:00+09:00",
  "timeline": [
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
    }
  ],
  "categories": [...],
  "metadata": {...}
}
```

### `data/user-tweets.json` - Tweetデータ（変更なし）

```json
{
  "version": "2.2.0",
  "lastUpdated": "2026-06-25T21:00:00+09:00",
  "source": "static",
  "tweets": [
    {
      "date": "2024-05-18",
      "items": [
        {
          "tweetId": "1111111111111111111",
          "note": "ライブ2日前の期待"
        }
      ]
    },
    {
      "date": "2024-05-19",
      "items": [
        {
          "tweetId": "2222222222222222222",
          "note": "ライブ前日の興奮"
        }
      ]
    },
    {
      "date": "2024-05-20",
      "items": [
        {
          "tweetId": "3333333333333333333",
          "note": "ライブ当日の感想"
        }
      ]
    },
    {
      "date": "2024-05-21",
      "items": [
        {
          "tweetId": "4444444444444444444",
          "note": "ライブ翌日の余韻"
        }
      ]
    },
    {
      "date": "2024-05-22",
      "items": [
        {
          "tweetId": "5555555555555555555",
          "note": "ライブ2日後の思い出"
        }
      ]
    }
  ],
  "metadata": {...}
}
```

---

## 3. コンポーネント設計の変更

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

  // 見出し日付の前後2日間のTweetを取得する関数
  const getTweetsForDate = (displayDate: string): Tweet[] => {
    const date = new Date(displayDate);
    const tweets: Tweet[] = [];

    // 前後2日間（合計5日間）のTweetを取得
    for (let i = -2; i <= 2; i++) {
      const targetDate = new Date(date);
      targetDate.setDate(date.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      if (tweetsMap[dateStr]) {
        tweets.push(...tweetsMap[dateStr]);
      }
    }

    return tweets;
  };

  return (
    <div className="space-y-8">
      {sortedTimeline.map((day) => (
        <DayEntry
          key={day.date}
          date={day.date}
          events={day.events}
          tweets={getTweetsForDate(day.date)}
          categories={categories}
        />
      ))}
    </div>
  );
}
```

### 主な変更点

#### ✅ `getTweetsForDate`関数の追加
- **見出し日付**を基準に前後2日間（合計5日間）のTweetを取得
- 日付計算を行い、該当する全てのTweetを配列に格納

#### ✅ Tweet表示ロジックの変更
- 旧: 日付が完全一致するTweetのみ表示
- 新: **見出し日付**の前後2日間のTweetを全て表示

#### ✅ 重複回避
- 活動情報が連続する日でも、各見出し日付に対して独立して計算
- 同じTweetが複数の見出しに表示されることはない

---

## 4. 表示例

### ケース1: 活動日にTweetがある場合

```
活動日: 2024-05-20
Tweet: 2024-05-18, 2024-05-19, 2024-05-20, 2024-05-21, 2024-05-22

表示:
┌─────────────────────────────────────────────┐
│  📅 2024年5月20日（月）                      │
├──────────────────┬──────────────────────────┤
│  🎤 ライブ        │  あなたのTweet（5件）    │
│  初の単独ライブ   │  ・5/18のTweet           │
│                  │  ・5/19のTweet           │
│                  │  ・5/20のTweet           │
│                  │  ・5/21のTweet           │
│                  │  ・5/22のTweet           │
└──────────────────┴──────────────────────────┘
```

### ケース2: 活動日にTweetがない場合

```
活動日: 2024-05-20
Tweet: 2024-05-19, 2024-05-21のみ

表示:
┌─────────────────────────────────────────────┐
│  📅 2024年5月20日（月）                      │
├──────────────────┬──────────────────────────┤
│  🎤 ライブ        │  あなたのTweet（2件）    │
│  初の単独ライブ   │  ・5/19のTweet           │
│                  │  ・5/21のTweet           │
└──────────────────┴──────────────────────────┘
```

### ケース3: 前後2日間にTweetがない場合

```
活動日: 2024-05-20
Tweet: なし

表示:
┌─────────────────────────────────────────────┐
│  📅 2024年5月20日（月）                      │
├──────────────────┬──────────────────────────┤
│  🎤 ライブ        │  あなたのTweet           │
│  初の単独ライブ   │  この日の思い出ポストは  │
│                  │  ありません              │
└──────────────────┴──────────────────────────┘
```

---

## 5. 実装フェーズ案（v2.2）

### フェーズ1: Tweet表示範囲の変更（今回）
- [ ] `TimelineContainer.tsx`に`getTweetsForDate`関数を追加
- [ ] 見出し日付の前後2日間のTweetを取得するロジックを実装
- [ ] 活動情報が連続する場合の動作確認
- [ ] 動作確認（デスクトップ・モバイル）
- [ ] ドキュメント更新

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

### ✅ より自然な思い出の表示
- 活動前の期待感、当日の興奮、翌日の余韻を一緒に表示
- 「その時の気持ちの流れ」が見える

### ✅ Tweet日付のズレに対応
- 活動当日にTweetしなくても、前後のTweetが表示される
- より柔軟な思い出の記録が可能

### ✅ ユーザー体験の向上
- 活動情報を見ながら、その前後の自分の気持ちを振り返れる
- より「エモい」体験を提供

---

## 7. 技術的な補足事項

### 日付計算の実装

```tsx
// 見出し日付の前後2日間のTweetを取得
const getTweetsForDate = (displayDate: string): Tweet[] => {
  const date = new Date(displayDate);
  const tweets: Tweet[] = [];

  // 前後2日間（合計5日間）のTweetを取得
  for (let i = -2; i <= 2; i++) {
    const targetDate = new Date(date);
    targetDate.setDate(date.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0];
    
    if (tweetsMap[dateStr]) {
      tweets.push(...tweetsMap[dateStr]);
    }
  }

  return tweets;
};
```

### パフォーマンス考慮
- `tweetsMap`を事前に作成（O(1)でルックアップ）
- 日付計算は活動日ごとに1回のみ
- 大量のTweetがあっても高速に動作

---

## 8. 次のステップ

この改訂版v2.2の提案内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`TimelineContainer.tsx`の改修** - `getTweetsForDate`関数の追加
2. **動作確認** - デスクトップ・モバイルでの表示確認
3. **ドキュメント更新** - README.mdにv2.2の変更内容を反映

ご確認・ご意見をお願いいたします！🎉
