# ExWHYZ-Timeline X API連携版 実装提案書（v3.0）

## 📋 概要

モック版のNext.jsアプリケーションを、X API連携版に改修するための詳細な実装提案書です。

### 主な変更点
- **OAuth認証**: NextAuth.jsを使用したX（Twitter）ログイン
- **X API連携**: ユーザーのポストデータを取得
- **キャッシュ機構**: localStorageによるAPIコスト削減
- **手動更新機能**: 更新ボタンによるデータ再取得
- **モック/本番切り替え**: 環境変数による簡単な切り替え

---

## 1. アーキテクチャ設計

### システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js App                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐         ┌──────────────┐              │
│  │   page.tsx   │────────▶│ TimelineView │              │
│  │ (Client)     │         │  Component   │              │
│  └──────────────┘         └──────┬───────┘              │
│                                   │                       │
│                          ┌────────▼────────┐             │
│                          │  DataProvider   │             │
│                          │   (Context)     │             │
│                          └────────┬────────┘             │
│                                   │                       │
│              ┌────────────────────┼────────────────┐     │
│              │                    │                │     │
│      ┌───────▼──────┐    ┌───────▼──────┐  ┌─────▼────┐│
│      │ Mock Data    │    │ localStorage │  │ X API    ││
│      │ (JSON)       │    │   Cache      │  │ Service  ││
│      └──────────────┘    └──────────────┘  └──────────┘│
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### データフロー

```
1. 初回アクセス
   ├─ 環境変数チェック (NEXT_PUBLIC_USE_MOCK)
   ├─ Mock Mode → JSONファイルから読み込み
   └─ Production Mode
      ├─ OAuth認証チェック
      ├─ 未認証 → ログイン画面表示
      └─ 認証済み
         ├─ localStorageチェック
         ├─ キャッシュあり → キャッシュから表示
         └─ キャッシュなし → X APIから取得 → localStorage保存

2. 更新ボタン押下
   └─ X APIから最新データ取得 → localStorage更新 → 画面再描画
```

---

## 2. 必要なパッケージ

### 追加インストールが必要なパッケージ

```json
{
  "dependencies": {
    "next-auth": "^4.24.0",
    "twitter-api-v2": "^1.17.0"
  }
}
```

### インストールコマンド

```bash
cd exwhyz-timeline
npm install next-auth twitter-api-v2
```

---

## 3. 環境変数設定

### `.env.local`ファイルの作成

```bash
# モック/本番切り替え
NEXT_PUBLIC_USE_MOCK=false

# NextAuth設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# X API認証情報（X Developer Portalで取得）
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret

# X API v2エンドポイント
TWITTER_API_BEARER_TOKEN=your-bearer-token
```

### X API認証情報の取得方法

1. [X Developer Portal](https://developer.twitter.com/)にアクセス
2. プロジェクトとアプリを作成
3. OAuth 2.0設定を有効化
4. Client ID、Client Secret、Bearer Tokenを取得
5. Callback URL: `http://localhost:3000/api/auth/callback/twitter`

---

## 4. ディレクトリ構造

### 新規作成するファイル

```
exwhyz-timeline/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts          # NextAuth設定
│   │   └── tweets/
│   │       ├── fetch/
│   │       │   └── route.ts          # X APIからツイート取得
│   │       └── cache/
│   │           └── route.ts          # キャッシュ管理
│   └── login/
│       └── page.tsx                  # ログイン画面
├── lib/
│   ├── auth.ts                       # NextAuth設定
│   ├── twitter-api.ts                # X API クライアント
│   ├── cache.ts                      # localStorage管理
│   └── data-provider.ts              # データ取得ロジック
├── contexts/
│   └── DataContext.tsx               # データ管理Context
├── hooks/
│   └── useTwitterData.ts             # データ取得Hook
└── types/
    └── twitter.ts                    # X API型定義
```

---

## 5. 実装詳細

### 5.1 NextAuth設定（`lib/auth.ts`）

```typescript
import { NextAuthOptions } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';

export const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.userId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.userId = token.userId as string;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
```

### 5.2 NextAuth APIルート（`app/api/auth/[...nextauth]/route.ts`）

```typescript
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

### 5.3 X API クライアント（`lib/twitter-api.ts`）

```typescript
import { TwitterApi } from 'twitter-api-v2';

export async function fetchUserTweets(
  accessToken: string,
  userId: string,
  startDate?: string,
  endDate?: string
) {
  const client = new TwitterApi(accessToken);
  
  try {
    const tweets = await client.v2.userTimeline(userId, {
      max_results: 100,
      'tweet.fields': ['created_at', 'text', 'attachments'],
      'media.fields': ['url', 'preview_image_url'],
      start_time: startDate,
      end_time: endDate,
    });

    return tweets.data.data || [];
  } catch (error) {
    console.error('Error fetching tweets:', error);
    throw error;
  }
}

export function formatTweetsForTimeline(tweets: any[]) {
  // ツイートを日付ごとにグループ化
  const groupedByDate: Record<string, any[]> = {};

  tweets.forEach((tweet) => {
    const date = new Date(tweet.created_at).toISOString().split('T')[0];
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push({
      tweetId: tweet.id,
      note: '', // 必要に応じてメモを追加
    });
  });

  // timeline.jsonと同じ形式に変換
  return Object.entries(groupedByDate).map(([date, items]) => ({
    date,
    items,
  }));
}
```

### 5.4 localStorage管理（`lib/cache.ts`）

```typescript
const CACHE_KEY = 'exwhyz_timeline_tweets';
const CACHE_TIMESTAMP_KEY = 'exwhyz_timeline_tweets_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間

export function getCachedTweets() {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (!cached || !timestamp) return null;

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > CACHE_DURATION) {
      // キャッシュが古い場合は削除
      clearCache();
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

export function setCachedTweets(tweets: any[]) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tweets));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

export function clearCache() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
}

export function getCacheAge() {
  if (typeof window === 'undefined') return null;

  const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (!timestamp) return null;

  return Date.now() - parseInt(timestamp, 10);
}
```

### 5.5 データプロバイダー（`lib/data-provider.ts`）

```typescript
import { getCachedTweets, setCachedTweets } from './cache';
import mockTweets from '@/data/user-tweets.json';

export async function getTweetsData(forceRefresh = false) {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  // モックモード
  if (useMock) {
    return mockTweets.tweets;
  }

  // 本番モード
  if (!forceRefresh) {
    const cached = getCachedTweets();
    if (cached) {
      return cached;
    }
  }

  // X APIから取得
  try {
    const response = await fetch('/api/tweets/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tweets');
    }

    const data = await response.json();
    setCachedTweets(data.tweets);
    return data.tweets;
  } catch (error) {
    console.error('Error fetching tweets:', error);
    // エラー時はキャッシュまたはモックデータを返す
    return getCachedTweets() || mockTweets.tweets;
  }
}
```

### 5.6 データ取得Hook（`hooks/useTwitterData.ts`）

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getTweetsData } from '@/lib/data-provider';
import { getCacheAge } from '@/lib/cache';

export function useTwitterData() {
  const [tweets, setTweets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  const loadTweets = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getTweetsData(forceRefresh);
      setTweets(data);
      setCacheAge(getCacheAge());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTweets();
  }, []);

  const refresh = () => loadTweets(true);

  return { tweets, loading, error, cacheAge, refresh };
}
```

### 5.7 X API取得エンドポイント（`app/api/tweets/fetch/route.ts`）

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchUserTweets, formatTweetsForTimeline } from '@/lib/twitter-api';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { startDate, endDate } = await request.json();

    const tweets = await fetchUserTweets(
      session.accessToken,
      session.userId,
      startDate,
      endDate
    );

    const formattedTweets = formatTweetsForTimeline(tweets);

    return NextResponse.json({
      tweets: formattedTweets,
      count: tweets.length,
    });
  } catch (error) {
    console.error('Error in /api/tweets/fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tweets' },
      { status: 500 }
    );
  }
}
```

### 5.8 ログイン画面（`app/login/page.tsx`）

```typescript
'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            ExWHYZ Timeline
          </h1>
          <p className="text-gray-400 text-sm">
            輝きの軌跡 × あなたの思い出
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-4">
            ログインが必要です
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            あなたのXアカウントでログインして、タイムラインを表示します。
          </p>

          <button
            onClick={() => signIn('twitter', { callbackUrl: '/' })}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Xでログイン
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs">
            ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます。
          </p>
        </div>
      </div>
    </main>
  );
}
```

### 5.9 メインページの改修（`app/page.tsx`）

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import TimelineContainer from '@/components/Timeline/TimelineContainer';
import RefreshButton from '@/components/RefreshButton';
import { useTwitterData } from '@/hooks/useTwitterData';
import timelineData from '@/data/timeline.json';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { tweets, loading, error, cacheAge, refresh } = useTwitterData();

  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  useEffect(() => {
    // 本番モードで未認証の場合はログイン画面へ
    if (!useMock && status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, useMock, router]);

  if (!useMock && status === 'loading') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">読み込み中...</div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">データを読み込んでいます...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500">エラー: {error}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            ExWHYZ Timeline
          </h1>
          <p className="text-gray-400 text-sm">
            輝きの軌跡 × あなたの思い出
          </p>
          
          {/* 更新ボタン */}
          {!useMock && (
            <div className="mt-4">
              <RefreshButton onRefresh={refresh} cacheAge={cacheAge} />
            </div>
          )}
        </header>

        {/* タイムライン */}
        <TimelineContainer 
          timeline={timelineData.timeline} 
          categories={timelineData.categories}
          userTweets={tweets}
        />
      </div>
    </main>
  );
}
```

### 5.10 更新ボタンコンポーネント（`components/RefreshButton.tsx`）

```typescript
'use client';

interface RefreshButtonProps {
  onRefresh: () => void;
  cacheAge: number | null;
}

export default function RefreshButton({ onRefresh, cacheAge }: RefreshButtonProps) {
  const formatCacheAge = (age: number | null) => {
    if (age === null) return 'キャッシュなし';
    
    const minutes = Math.floor(age / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}時間前に更新`;
    } else if (minutes > 0) {
      return `${minutes}分前に更新`;
    } else {
      return '今更新';
    }
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={onRefresh}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        最新のポストを取得
      </button>
      
      {cacheAge !== null && (
        <span className="text-gray-500 text-sm">
          {formatCacheAge(cacheAge)}
        </span>
      )}
    </div>
  );
}
```

---

## 6. 型定義（`types/twitter.ts`）

```typescript
export interface Tweet {
  id: string;
  text: string;
  created_at: string;
  attachments?: {
    media_keys?: string[];
  };
}

export interface UserTweetData {
  date: string;
  items: {
    tweetId: string;
    note?: string;
  }[];
}

export interface TwitterSession {
  accessToken: string;
  userId: string;
}
```

---

## 7. 実装フェーズ

### フェーズ1: 基盤構築（1-2日）
- [x] 提案書作成
- [ ] 必要なパッケージのインストール
- [ ] 環境変数の設定
- [ ] ディレクトリ構造の作成

### フェーズ2: 認証機能（2-3日）
- [ ] NextAuth設定
- [ ] ログイン画面の実装
- [ ] セッション管理の実装
- [ ] 認証フローのテスト

### フェーズ3: X API連携（3-4日）
- [ ] X APIクライアントの実装
- [ ] ツイート取得エンドポイントの実装
- [ ] データフォーマット変換の実装
- [ ] エラーハンドリングの実装

### フェーズ4: キャッシュ機構（1-2日）
- [ ] localStorage管理の実装
- [ ] キャッシュ有効期限の実装
- [ ] キャッシュクリア機能の実装

### フェーズ5: UI改修（2-3日）
- [ ] メインページの改修
- [ ] 更新ボタンの実装
- [ ] ローディング状態の実装
- [ ] エラー表示の実装

### フェーズ6: テスト・デバッグ（2-3日）
- [ ] モックモードのテスト
- [ ] 本番モードのテスト
- [ ] エラーケースのテスト
- [ ] パフォーマンステスト

---

## 8. 注意事項

### X API制限
- **Rate Limit**: 15分あたり15リクエスト（ユーザータイムライン）
- **月間制限**: プランによって異なる（Free: 1,500ツイート/月）
- **対策**: localStorageキャッシュで頻繁なAPI呼び出しを防ぐ

### セキュリティ
- **環境変数**: `.env.local`をGitにコミットしない
- **アクセストークン**: サーバーサイドでのみ使用
- **CORS**: Next.js APIルートを使用してクライアントから直接APIを呼ばない

### パフォーマンス
- **初回読み込み**: キャッシュがない場合は遅くなる可能性
- **対策**: ローディング状態を適切に表示

---

## 9. 次のステップ

この提案書の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **環境構築**: パッケージインストールと環境変数設定
2. **認証機能**: NextAuthとログイン画面の実装
3. **X API連携**: ツイート取得機能の実装
4. **キャッシュ機構**: localStorage管理の実装
5. **UI改修**: メインページと更新ボタンの実装
6. **テスト**: 動作確認とデバッグ

ご確認・ご意見をお願いいたします！🎉
