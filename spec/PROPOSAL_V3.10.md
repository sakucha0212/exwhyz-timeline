# ExWHYZ-Timeline ツイート検索ワード追加 変更要求書（v3.10）

## 📋 変更要件の整理

### v3.10での変更要件

- **ツイートの検索条件に新たなワードを追加する**:  
  現状の検索クエリでは一部のメンバー関連ワードが含まれておらず、表示されるツイートが不足している。  
  以下の3ワードを OR 条件に追加する。
  - `SeihoWHYZ`
  - `イクス`
  - `PEDROWHYZ`

---

## 1. 変更の背景と目的

### 現状の課題

| 課題 | 詳細 |
|------|------|
| 検索ワードが不足している | `SeihoWHYZ`・`PEDROWHYZ`（メンバーの X アカウント名）および `イクス`（グループ名の略称）が検索クエリに含まれていないため、これらのワードを含むツイートが取得されない |
| 表示されるツイートが少ない | 検索ワードの不足により、ExWHYZ 関連のツイートが一部取得できていない |

### 変更の目的

- **検索ワードを追加して取得漏れを解消する**: `SeihoWHYZ`・`PEDROWHYZ`・`イクス` を OR 条件に追加し、より多くの ExWHYZ 関連ツイートを取得できるようにする

---

## 2. 変更対象ファイルと変更内容

### 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/twitter-api.ts` | **修正** | `EXWHYZ_SEARCH_QUERY` 定数に `SeihoWHYZ`・`PEDROWHYZ`・`イクス` を追加 |

---

## 3. 変更詳細

### 3.1 `lib/twitter-api.ts` の変更

#### 変更前（v3.9）

```typescript
export const EXWHYZ_SEARCH_QUERY =
  '(ExWHYZ OR mikina OR yu-ki OR maho OR mayu OR now OR midoriko ' +
  'OR イクスワイズ OR ミキナ OR ユーキ OR マホ OR マユ OR ナウ OR ミドリコ OR ドリ ' +
  'OR みきな OR まほ OR ゆーき OR まほ OR なう OR みどりこ OR どり) ' +
  '-is:retweet -is:reply';
```

#### 変更後（v3.10）

```typescript
export const EXWHYZ_SEARCH_QUERY =
  '(ExWHYZ OR mikina OR yu-ki OR maho OR mayu OR now OR midoriko ' +
  'OR SeihoWHYZ OR PEDROWHYZ ' +
  'OR イクスワイズ OR イクス OR ミキナ OR ユーキ OR マホ OR マユ OR ナウ OR ミドリコ OR ドリ ' +
  'OR みきな OR まほ OR ゆーき OR まほ OR なう OR みどりこ OR どり) ' +
  '-is:retweet -is:reply';
```

**変更点のまとめ:**
- 英語ワード行に `SeihoWHYZ OR PEDROWHYZ` を追加
- カタカナワード行に `イクス` を追加（`イクスワイズ` の直後）

---

## 4. 追加ワードの整理

| ワード | 種別 | 追加理由 |
|--------|------|---------|
| `SeihoWHYZ` | 英語（メンバー X アカウント名） | メンバーの X アカウント名が検索対象外だった |
| `PEDROWHYZ` | 英語（メンバー X アカウント名） | メンバーの X アカウント名が検索対象外だった |
| `イクス` | カタカナ（グループ名略称） | グループ名の略称が検索対象外だった |

---

## 5. 処理の流れ（v3.10）

```
変更前:
  query = "from:username (ExWHYZ OR mikina OR ... OR イクスワイズ OR ...) -is:retweet -is:reply"

変更後:
  query = "from:username (ExWHYZ OR mikina OR ... OR SeihoWHYZ OR PEDROWHYZ OR イクスワイズ OR イクス OR ...) -is:retweet -is:reply"
```

---

## 6. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `EXWHYZ_SEARCH_QUERY` の利用箇所 | ✅ 維持 | `fetchUserArchiveTweets()` 内で `from:username` と組み合わせて使用。利用方法は変更なし |
| `formatTweetsForTimeline` の戻り値 | ✅ 維持 | 検索結果の形式は変更なし |
| キャッシュ機構 | ⚠️ 注意 | 検索ワード追加により新たなツイートが取得される可能性があるため、「最新のポストを取得」ボタンで再取得が必要 |
| モックモード (`NEXT_PUBLIC_USE_MOCK=true`) | ✅ 変更なし | モックモードでは `EXWHYZ_SEARCH_QUERY` は使用されない |

---

## 7. 実装フェーズ案

### フェーズ1: `lib/twitter-api.ts` の修正
- [ ] `EXWHYZ_SEARCH_QUERY` に `SeihoWHYZ`・`PEDROWHYZ` を追加
- [ ] `EXWHYZ_SEARCH_QUERY` に `イクス` を追加

### フェーズ2: 動作確認
- [ ] 「最新のポストを取得」ボタンで再取得し、新たなツイートが取得されるか確認
- [ ] `SeihoWHYZ`・`PEDROWHYZ`・`イクス` を含むツイートが表示されるか確認

---

## 8. 次のステップ

この変更要求書（v3.10）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`lib/twitter-api.ts` の修正** — `EXWHYZ_SEARCH_QUERY` への3ワード追加
2. **動作確認** — 「最新のポストを取得」で再取得し、新たなツイートが表示されるか確認

ご確認・ご意見をお願いいたします！🎉
