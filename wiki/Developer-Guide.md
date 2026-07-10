# ExWHYZ Timeline — 開発者ガイド

> **対象読者**: このプロジェクトを開発・運用する方向けのドキュメントです。  
> プロジェクトの概要は [README](../README.md) を、ファン向けの使い方は [[Fan-Guide]] をご覧ください。

---

## 目次

1. [技術スタック](#1-技術スタック)
2. [ディレクトリ構造](#2-ディレクトリ構造)
3. [セットアップ](#3-セットアップ)
4. [環境変数リファレンス](#4-環境変数リファレンス)
5. [アーキテクチャ](#5-アーキテクチャ)
6. [データ構造](#6-データ構造)
7. [X API 連携](#7-x-api-連携)

---

## 1. 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|----------|
| フレームワーク | Next.js (App Router) | 16.2.9 |
| 言語 | TypeScript | ^5 |
| スタイリング | Tailwind CSS | ^4 |
| 認証 | NextAuth.js | ^4.24.14 |
| X API クライアント | twitter-api-v2 | ^1.29.0 |
| Tweet 埋め込み | react-twitter-embed | ^4.0.4 |
| キャッシュ | IndexedDB（ブラウザ内蔵） | — |
| ランタイム | Node.js | 18.x 以上 |

---

## 2. ディレクトリ構造

```
exwhyz-timeline/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth 設定
│   │   └── tweets/fetch/         # X API 取得エンドポイント
│   ├── login/page.tsx            # ログイン画面
│   ├── page.tsx                  # メインページ
│   ├── layout.tsx                # ルートレイアウト
│   └── globals.css               # グローバルスタイル
├── components/
│   └── Timeline/
│       ├── TimelineContainer.tsx # タイムライン全体のコンテナ（月単位表示）
│       ├── MonthPagination.tsx   # 月ナビゲーション UI（前月/次月/年月ピッカー/更新ボタン）
│       ├── DayEntry.tsx          # 日付ごとのエントリー
│       ├── EventColumn.tsx       # 活動情報カラム
│       ├── TweetColumn.tsx       # Tweet カラム
│       ├── TweetEmbed.tsx        # X ポスト埋め込み
│       └── CategoryBadge.tsx     # カテゴリバッジ
├── hooks/
│   └── useMonthlyTwitterData.ts  # 月単位データ管理フック
├── lib/
│   ├── idb-cache.ts              # IndexedDB 月単位キャッシュ管理
│   ├── data-provider-monthly.ts  # 月単位データ取得ロジック
│   ├── twitter-api.ts            # X API クライアント・検索クエリ
│   ├── auth.ts                   # NextAuth 設定
│   └── constants.ts              # クライアント共通定数
├── types/
│   └── next-auth.d.ts            # NextAuth 型定義拡張
├── data/
│   ├── timeline.json             # ExWHYZ 公式活動情報（静的マスターデータ）
│   └── user-tweets.json          # モック Tweet データ
└── .env.local                    # 環境変数（Git 管理外）
```

---

## 3. セットアップ

### 3.1 必要な環境

- Node.js 18.x 以上
- npm

### 3.2 インストール

```bash
cd exwhyz-timeline
npm install
```

### 3.3 環境変数の設定

`exwhyz-timeline/.env.local` を作成します。

**モックモード（X API 不要・開発用）:**

```bash
NEXT_PUBLIC_USE_MOCK=true
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-key-change-in-production
```

**本番モード（X API 連携）:**

```bash
NEXT_PUBLIC_USE_MOCK=false
NEXTAUTH_URL=https://your-domain.example.com
NEXTAUTH_SECRET=your-strong-secret-key

TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
TWITTER_API_BEARER_TOKEN=your_bearer_token
```

### 3.4 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### 3.5 ビルド・本番起動

```bash
npm run build
npm start
```

### 3.6 ngrok を使ったローカル開発（OAuth コールバック用）

X API の OAuth 2.0 認証はコールバック URL に `https://` が必要です。  
ローカル開発では ngrok を使って HTTPS トンネルを作成します。

```bash
# ngrok でトンネルを作成
ngrok http 3000

# .env.local の NEXTAUTH_URL を ngrok の URL に変更
NEXTAUTH_URL=https://xxxx-xxxx.ngrok-free.app
```

---

## 4. 環境変数リファレンス

| 環境変数 | 説明 | デフォルト値 | 必須 |
|---------|------|------------|------|
| `NEXT_PUBLIC_USE_MOCK` | `true`: モックデータ使用（X API 不要）/ `false`: X API 使用 | `false` | ✅ |
| `NEXT_PUBLIC_SURROUNDING_DAYS` | 活動日の前後何日分の見出し日付を表示するか（`0`〜） | `2` | — |
| `NEXT_PUBLIC_ARCHIVE_START_DATE` | アーカイブ開始日時（クライアント側、ISO 8601） | `2022-06-01T00:00:00Z` | — |
| `NEXT_PUBLIC_ARCHIVE_END_DATE` | アーカイブ終了日時（クライアント側、ISO 8601） | `2026-09-30T23:59:59Z` | — |
| `TWITTER_ARCHIVE_START_DATE` | アーカイブ開始日時（サーバー側、ISO 8601） | `2022-06-01T00:00:00Z` | — |
| `NEXTAUTH_URL` | NextAuth のコールバック URL | — | ✅ |
| `NEXTAUTH_SECRET` | NextAuth のシークレットキー（本番では必ず変更） | — | ✅ |
| `TWITTER_CLIENT_ID` | X Developer Portal のクライアント ID | — | 本番のみ |
| `TWITTER_CLIENT_SECRET` | X Developer Portal のクライアントシークレット | — | 本番のみ |
| `TWITTER_API_BEARER_TOKEN` | X API Bearer Token | — | 本番のみ |

### `NEXT_PUBLIC_SURROUNDING_DAYS` の詳細

| 設定値 | 表示される見出し日付の範囲 | 合計表示日数 |
|--------|--------------------------|------------|
| `0` | 活動日のみ | 1日 |
| `1` | 活動日の前後1日 | 3日 |
| `2` | 活動日の前後2日（デフォルト） | 5日 |

---

## 5. アーキテクチャ

### 5.1 コンポーネント階層

```
app/page.tsx
└── TimelineContainer
    ├── MonthPagination          ← 月ナビゲーション（前月/次月/年月ピッカー/更新ボタン）
    └── DayEntry × N            ← 選択月の日付ごとに1つ
        ├── EventColumn          ← 左カラム: 公式活動情報
        │   └── CategoryBadge × N
        └── TweetColumn          ← 右カラム: X ポスト
            └── TweetEmbed × N
```

### 5.2 データフロー

```
月切り替え（MonthPagination）
    │
    ▼
useMonthlyTwitterData(yearMonth)
    │
    ▼
getMonthlyTweetsData(yearMonth, forceRefresh)  ← data-provider-monthly.ts
    │
    ├─ [モックモード]          → user-tweets.json を月フィルタして返す
    │
    ├─ [過去月・キャッシュあり] → IndexedDB から返す（API 呼び出しなし）
    │
    ├─ [過去月・キャッシュなし] → GET /api/tweets/fetch?startTime=&endTime=
    │                            → IndexedDB に保存 → 返す
    │
    ├─ [当月・通常表示]        → IndexedDB から返す（キャッシュあり時）
    │
    └─ [当月・差分更新]        → GET /api/tweets/fetch?sinceId=
                                → IndexedDB にマージ → 返す
```

### 5.3 月ナビゲーションの状態

| 状態 | 「← 前月」 | 「次月 →」 | 「🔄 更新」 |
|------|-----------|-----------|-----------|
| 通常（過去月） | 有効 | 有効 | 非表示 |
| 最古月（2022年6月） | **disabled** | 有効 | 非表示 |
| 当月 | 有効 | **disabled** | 表示・有効 |
| ローディング中 | **disabled** | **disabled** | **disabled** |

### 5.4 IndexedDB スキーマ

```
DB: exwhyz_timeline_cache (version: 1)
  ├── Store: monthly_tweets
  │     keyPath: "yearMonth"  (例: "2024-06")
  │     Record: {
  │       yearMonth:     string,       // "YYYY-MM"
  │       tweets:        DayData[],    // 日付ごとの Tweet 配列
  │       fetchedAt:     string,       // ISO 8601 最終取得日時
  │       isCurrent:     boolean,      // 当月フラグ
  │       latestTweetId: string | null // 差分更新の since_id 用
  │     }
  └── Store: metadata
        keyPath: "key"
        Record: { key: "lastFetchedAt", value: string }
```

---

## 6. データ構造

### 6.1 `data/timeline.json`（公式活動情報）

```json
{
  "version": "2.1.0",
  "timeline": [
    {
      "date": "2024-05-20",
      "events": [
        {
          "id": "evt_001",
          "title": "イベントタイトル",
          "category": "live",
          "description": "イベントの説明",
          "officialSource": {
            "type": "official",
            "url": "https://..."
          },
          "tags": ["タグ1", "タグ2"]
        }
      ]
    }
  ],
  "categories": [
    { "id": "live", "label": "ライブ", "color": "#ff007f", "icon": "🎤" }
  ],
  "metadata": {
    "totalDays": 100,
    "dateRange": { "start": "2022-06-01", "end": "2026-09-30" }
  }
}
```

**カテゴリ一覧:**

| id | 説明 |
|----|------|
| `live` | ライブ・コンサート |
| `release` | CD・配信リリース |
| `media` | メディア出演 |
| `announce` | 発表・告知 |

### 6.2 `data/user-tweets.json`（モック Tweet データ）

```json
{
  "version": "2.1.0",
  "source": "static",
  "tweets": [
    {
      "date": "2024-05-21",
      "items": [
        {
          "tweetId": "1234567890123456789",
          "note": "このポストについてのメモ（任意）"
        }
      ]
    }
  ]
}
```

---

## 7. X API 連携

### 7.1 ｘAPIの利用について

`/2/tweets/search/all`（全アーカイブ検索）を利用しています。  
利用にはx Developer Consoleにユーザー登録が必要です。  
APIはツイートの読み込み件数で**従量課金**となるので注意してください。  

### 7.2 X Developer Portal での設定手順

1. [developer.twitter.com](https://developer.twitter.com) でアプリを作成
2. **OAuth 2.0** を有効化
3. コールバック URL に `https://your-domain/api/auth/callback/twitter` を追加
4. `Client ID` / `Client Secret` / `Bearer Token` を取得
5. `.env.local` に設定

### 7.3 検索クエリ（`EXWHYZ_SEARCH_QUERY`）

ログインユーザーの ExWHYZ 関連ポストを取得するために以下のクエリを使用します。

```
from:{username} (ExWHYZ OR WHYZ OR NATSLIVE OR mikina OR yu-ki OR maho OR mayu OR now OR midoriko
OR イクスワイズ OR イクス OR ミキナ OR ユーキ OR マホ OR マユ OR ナウ OR ミドリコ OR ドリ
OR みきな OR まほ OR ゆーき OR まゆ OR なう OR みどりこ OR どり OR ちぇきな
OR EMPiRE OR "俺とお前で音源チェック")
-is:retweet -is:reply
```

- リツイート・リプライは除外
- `EMPiRE`（メンバーの前身グループ）も対象
- `"俺とお前で音源チェック"` はフレーズ検索（完全一致）

### 7.4 レート制限エラーの挙動

X API が HTTP 429 を返した場合、アプリは以下の動作をします：

- `rateLimitError: true` フラグを UI に伝達
- 「🔄 更新」ボタンを disabled 状態にする
- エラーメッセージを表示

---
