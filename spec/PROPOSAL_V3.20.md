# ExWHYZ-Timeline 「Xで見る」ボタン削除・レイアウト最適化 変更要求書（v3.20）

## 📋 変更要件の整理

### v3.20での変更要件

1. **「Xで見る」ボタンの削除**: `TweetEmbed.tsx` に手動追加された「Xで見る」リンクを削除する
2. **レイアウトの最適化**: ボタン削除後の余白・スケール調整を見直し、すっきりした表示にする

---

## 1. 現状の問題（v3.19）

### 症状

ツイート埋め込みウィジェット（`TwitterTweetEmbed`）の下に「Xで見る」ボタンが二重表示されている。

**二重表示の内訳:**

| 表示箇所 | 内容 |
|---------|------|
| ① Twitter公式埋め込みウィジェット内 | ウィジェット右下に「Xで見る」リンクが内包されている |
| ② `TweetEmbed.tsx` で手動追加 | ウィジェット下部に別途「Xで見る」ボタンを配置している |

### 原因

`TweetEmbed.tsx` の29〜43行目に、手動で「Xで見る」リンクを追加しているため。
`TwitterTweetEmbed` コンポーネント自体がすでに「Xで見る」リンクを内包しているため、重複が発生している。

**現状のコード（問題箇所）:**

```tsx
{/* 小さなXで見るリンク（右下に配置） */}
<div className="flex justify-end">
  <a
    href={tweetUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-gray-300 transition-colors text-xs"
    title="Xで見る"
  >
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
    <span className="text-xs">Xで見る</span>
  </a>
</div>
```

---

## 2. 変更詳細

### 2.1 `components/Timeline/TweetEmbed.tsx`（修正）

**変更前:**

```tsx
'use client';

import { TwitterTweetEmbed } from 'react-twitter-embed';

interface TweetEmbedProps {
  tweetId: string;
}

export default function TweetEmbed({ tweetId }: TweetEmbedProps) {
  const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;

  return (
    <div className="space-y-1">
      {/* ツイート埋め込み */}
      <div className="rounded-lg">
        <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: 'calc(100% / 0.8)', marginBottom: '-15%' }}>
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
      </div>
      
      {/* 小さなXで見るリンク（右下に配置） */}
      <div className="flex justify-end">
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-gray-300 transition-colors text-xs"
          title="Xで見る"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span className="text-xs">Xで見る</span>
        </a>
      </div>
    </div>
  );
}
```

**変更後:**

```tsx
'use client';

import { TwitterTweetEmbed } from 'react-twitter-embed';

interface TweetEmbedProps {
  tweetId: string;
}

export default function TweetEmbed({ tweetId }: TweetEmbedProps) {
  return (
    <div className="rounded-lg overflow-hidden">
      <div style={{ transform: 'scale(0.85)', transformOrigin: 'top left', width: 'calc(100% / 0.85)', marginBottom: '-12%' }}>
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
    </div>
  );
}
```

**変更点の詳細:**

| 変更内容 | 変更前 | 変更後 | 理由 |
|---------|--------|--------|------|
| 「Xで見る」ボタン | あり（29〜43行目） | **削除** | ウィジェット内に既存のリンクがあるため重複を解消 |
| 外側ラッパーのクラス | `space-y-1` | `rounded-lg overflow-hidden` | ボタン削除後の余白を整理し、ウィジェットの角丸を適切に表示 |
| スケール値 | `scale(0.8)` | `scale(0.85)` | ボタン分の余白がなくなったため、やや大きく表示して視認性を向上 |
| `marginBottom` | `-15%` | `-12%` | スケール変更に合わせて下余白を調整 |
| `tweetUrl` 変数 | あり | **削除** | 「Xで見る」ボタン削除に伴い不要になるため |

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `components/Timeline/TweetEmbed.tsx` | **修正** | 手動追加の「Xで見る」ボタンを削除し、レイアウトを最適化 |

---

## 4. 修正の影響範囲

### 4.1 機能への影響

| 項目 | 影響 | 備考 |
|------|------|------|
| ツイート埋め込み表示 | ✅ 変更なし | `TwitterTweetEmbed` の動作は変わらない |
| 「Xで見る」リンク | ✅ 引き続き利用可能 | ウィジェット内のリンクが残るため機能は維持される |
| ツイートのテーマ・表示設定 | ✅ 変更なし | `options` の内容は変更なし |

### 4.2 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `TweetColumn.tsx` からの呼び出し | ✅ 変更なし | `TweetEmbed` の props インターフェースは変更なし |
| その他コンポーネント | ✅ 変更なし | `TweetEmbed` を使用する箇所は `TweetColumn.tsx` のみ |

---

## 5. 実装フェーズ案

### フェーズ1: 変更提案書作成
- [x] `spec/PROPOSAL_V3.20.md` を作成

### フェーズ2: コード修正
- [x] `components/Timeline/TweetEmbed.tsx` の「Xで見る」ボタンを削除し、レイアウトを最適化

---

## 6. 次のステップ

この変更要求書（v3.20）の内容でご承認いただけましたら、フェーズ2の実装を進めます。

ご確認・ご意見をお願いいたします！🎉
