# ExWHYZ-Timeline ツイート埋め込みの文字サイズ縮小 変更要求書（v3.14）

## 📋 変更要件の整理

### v3.14での変更要件

- **X埋め込みツイートの文字サイズを小さくする**:  
  `TwitterTweetEmbed`（react-twitter-embed）で表示しているX埋め込みツイートが  
  画面上で目立ちすぎているため、文字サイズを小さくして全体のバランスを改善する。

---

## 1. 技術的制約の整理

### X埋め込みの仕組み

X（Twitter）の埋め込みウィジェットは **`<iframe>`** として描画されます。  
iframeの内部はX側のドメインで管理されており、**外部CSSから直接スタイルを変更することはできません**（Same-Origin Policy）。

### `TwitterTweetEmbed` の `options` で制御できるもの

`react-twitter-embed` の `options` プロパティは、X公式の [oEmbed API パラメータ](https://developer.twitter.com/en/docs/twitter-for-websites/embedded-tweets/guides/embedded-tweet-parameter-reference) に対応しています。

| オプション | 効果 |
|-----------|------|
| `theme` | `'dark'` / `'light'` |
| `width` | ウィジェットの横幅（px または `'100%'`） |
| `conversation` | `'none'` でリプライ非表示 |
| `cards` | `'hidden'` でカード非表示 |

**文字サイズを直接変更するオプションは存在しません。**

### 代替アプローチ：CSS `transform: scale()` によるスケールダウン

iframeを含むラッパー要素に `transform: scale()` を適用することで、  
**埋め込みウィジェット全体を視覚的に縮小**することができます。

```css
transform: scale(0.80);
transform-origin: top left;
```

- `scale(0.85)` → 全体を85%に縮小（文字・画像・レイアウトすべて）
- `transform-origin: top left` → 左上を基準に縮小（右側に余白が生じる）
- ラッパーの `width` を `calc(100% / 0.85)` に広げることで余白を解消

---

## 2. 変更詳細

### 2.1 変更前（v3.13）

```tsx
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
```

### 2.2 変更後（v3.14）

```tsx
<div className="rounded-lg overflow-hidden">
  <div style={{ transform: 'scale(0.85)', transformOrigin: 'top left', width: 'calc(100% / 0.85)' }}>
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
```

**変更点のまとめ:**
- `TwitterTweetEmbed` を `scale(0.85)` のラッパー `<div>` で囲む
- `transformOrigin: 'top left'` で左上基準に縮小
- `width: 'calc(100% / 0.85)'` でスケール後の横幅を補正し、右側の余白を解消
- `options` の変更は不要（iframeの内部には影響しない）

---

## 3. スケール値の選択肢

| スケール値 | 縮小率 | 印象 |
|-----------|--------|------|
| `scale(0.9)` | 90% | 少し小さく（控えめな変化） |
| `scale(0.85)` | 85% | **推奨**（バランスが良い） |
| `scale(0.8)` | 80% | かなり小さく（コンパクト） |
| `scale(0.75)` | 75% | 非常に小さく（読みにくくなる可能性） |

デフォルトは `scale(0.85)` を推奨しますが、実際の表示を見て調整可能です。

---

## 4. 変更対象ファイル

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `components/Timeline/TweetEmbed.tsx` | **修正** | `TwitterTweetEmbed` をスケールラッパーで囲む |

---

## 5. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| デスクトップ表示 | ✅ 問題なし | スケール縮小のみ |
| スマホ表示 | ✅ 問題なし | スケール縮小のみ |
| ツイートの機能 | ✅ 変更なし | iframeの内部は変更なし（いいね・RT等は動作する） |
| 「Xで見る」リンク | ✅ 変更なし | ラッパー外のため影響なし |

---

## 6. 実装フェーズ案

### フェーズ1: `components/Timeline/TweetEmbed.tsx` の修正
- [ ] `TwitterTweetEmbed` を `scale(0.85)` のラッパー `<div>` で囲む
- [ ] `transformOrigin: 'top left'` を設定
- [ ] `width: 'calc(100% / 0.85)'` で横幅を補正

---

## 7. 次のステップ

この変更要求書（v3.14）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`components/Timeline/TweetEmbed.tsx` の修正** — スケールラッパーを追加

スケール値（`0.85`）は実際の表示を確認後、必要に応じて調整します。

ご確認・ご意見をお願いいたします！🎉
