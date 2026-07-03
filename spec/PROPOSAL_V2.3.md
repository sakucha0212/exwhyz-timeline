# ExWHYZ-Timeline タイムライン機能 提案書（改訂版v2.3）

## 📋 変更要件の整理

### v2.3での追加要件
- **Tweetのクリック機能追加**: Tweetをクリックすると、X（Twitter）の実際のツイート画面に遷移
- **画像付きTweetへの対応**: 埋め込み表示では画像が表示されにくいため、リンク遷移で実際のツイート画面で画像を確認できるようにする

---

## 1. Tweet表示の改善（v2.3）

### 設計思想

**v2.2の課題**:
- Tweetの埋め込み表示では、画像が含まれる場合に表示が難しい
- ユーザーが画像付きTweetを確認するには、別途Xを開く必要がある

**v2.3の改善**:
- **Tweetをクリック可能なリンクに変更**
- クリックすると、X（Twitter）の実際のツイート画面に遷移
- 画像、動画、その他のメディアを含むTweetも快適に閲覧可能

### UI/UX設計

#### Tweetカードのデザイン
```
┌─────────────────────────────────────┐
│ 💭 あなたのTweet                     │
├─────────────────────────────────────┤
│ 📝 ライブ2日前の期待                 │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Tweet埋め込み表示]              │ │
│ │                                 │ │
│ │ ← クリック可能                   │ │
│ │ ← ホバー時にカーソル変化         │ │
│ │ ← 新しいタブでXを開く            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### インタラクション
1. **通常状態**: Tweetが埋め込み表示される
2. **ホバー時**: カーソルがポインターに変化、背景色が微妙に変化
3. **クリック時**: 新しいタブでX（Twitter）のツイート画面を開く

---

## 2. コンポーネント設計の変更

### `TweetEmbed.tsx`の改修

#### 変更前（v2.2）
```tsx
'use client';

import { TwitterTweetEmbed } from 'react-twitter-embed';

interface TweetEmbedProps {
  tweetId: string;
}

export default function TweetEmbed({ tweetId }: TweetEmbedProps) {
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

#### 変更後（v2.3）
```tsx
'use client';

import { TwitterTweetEmbed } from 'react-twitter-embed';

interface TweetEmbedProps {
  tweetId: string;
}

export default function TweetEmbed({ tweetId }: TweetEmbedProps) {
  const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;

  const handleClick = () => {
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
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

### 主な変更点

#### ✅ クリック機能の追加
- `onClick`イベントで新しいタブでXのツイート画面を開く
- `window.open`を使用し、`_blank`で新しいタブを開く
- `noopener,noreferrer`でセキュリティを確保

#### ✅ ホバー効果の追加
- `cursor-pointer`: マウスホバー時にカーソルをポインターに変更
- `hover:opacity-90`: ホバー時に透明度を変更してクリック可能であることを示す
- `transition-opacity`: スムーズなアニメーション

#### ✅ アクセシビリティ対応
- `role="link"`: スクリーンリーダーにリンクであることを伝える
- `tabIndex={0}`: キーボードでフォーカス可能にする
- `onKeyDown`: EnterキーまたはSpaceキーでもクリック可能

---

## 3. 表示例

### ケース1: 通常のTweet
```
💭 あなたのTweet
┌─────────────────────────────────┐
│ 📝 ライブ2日前の期待             │
│ ┌─────────────────────────────┐ │
│ │ [Tweet埋め込み]              │ │
│ │ 「明後日ライブ！楽しみ！」    │ │
│ │                             │ │
│ │ ← クリックでXを開く          │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### ケース2: 画像付きTweet
```
💭 あなたのTweet
┌─────────────────────────────────┐
│ 📝 ライブ当日の感想              │
│ ┌─────────────────────────────┐ │
│ │ [Tweet埋め込み]              │ │
│ │ 「最高だった！」             │ │
│ │ [画像は表示されない]          │ │
│ │                             │ │
│ │ ← クリックでXを開いて        │ │
│ │    画像を確認できる          │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 4. 技術的な補足事項

### ツイートURLの構築
```tsx
const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;
```
- X（Twitter）の標準的なツイートURL形式
- `tweetId`を使用して動的にURLを生成

### セキュリティ考慮
```tsx
window.open(tweetUrl, '_blank', 'noopener,noreferrer');
```
- `noopener`: 新しいウィンドウが元のウィンドウにアクセスできないようにする
- `noreferrer`: リファラー情報を送信しない

### アクセシビリティ
```tsx
role="link"
tabIndex={0}
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
}}
```
- キーボード操作に対応
- スクリーンリーダーに適切な情報を提供

---

## 5. 実装フェーズ案（v2.3）

### フェーズ1: Tweetクリック機能の追加（今回）
- [x] `TweetEmbed.tsx`にクリック機能を追加
- [x] ホバー効果の実装
- [x] アクセシビリティ対応
- [ ] 動作確認（デスクトップ・モバイル）
- [ ] ドキュメント更新

### フェーズ2: インタラクション追加（v2.2から継続）
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

### ✅ 画像付きTweetへの対応
- 埋め込み表示では表示されない画像を、Xの実際の画面で確認できる
- 動画やその他のメディアも快適に閲覧可能

### ✅ ユーザー体験の向上
- ワンクリックで詳細なTweet情報にアクセス可能
- 元のTweetのコンテキスト（リプライ、リツイートなど）も確認できる

### ✅ シンプルな実装
- 既存のコンポーネントに最小限の変更で実装可能
- パフォーマンスへの影響なし

---

## 7. 代替案の検討

### 案1: 埋め込み表示を完全に廃止し、リンクカードのみ表示
**メリット**:
- ページの読み込みが高速化
- シンプルなUI

**デメリット**:
- Tweetの内容が一目で分からない
- ユーザーが毎回Xを開く必要がある

**結論**: 却下（埋め込み表示の利点を失う）

### 案2: 埋め込み表示とリンクボタンを併用
**メリット**:
- 埋め込み表示とリンクの両方を提供
- ユーザーが選択できる

**デメリット**:
- UIが複雑になる
- スペースを多く取る

**結論**: 却下（UIが煩雑になる）

### 案3: 埋め込み表示をクリック可能にする（採用案）
**メリット**:
- 既存のUIを維持
- 最小限の変更で実装可能
- 直感的な操作

**デメリット**:
- なし

**結論**: 採用

---

## 8. 次のステップ

この改訂版v2.3の提案内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`TweetEmbed.tsx`の改修** - クリック機能の追加
2. **動作確認** - デスクトップ・モバイルでの動作確認
3. **ドキュメント更新** - README.mdにv2.3の変更内容を反映

ご確認・ご意見をお願いいたします！🎉
