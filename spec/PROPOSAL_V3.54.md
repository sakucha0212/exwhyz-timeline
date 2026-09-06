# ExWHYZ-Timeline 過去月ポストの更新機能追加 変更要求書（v3.54）

## 📋 変更要件の整理

### v3.54 での変更要件

1. **過去月の更新ボタン有効化**: これまで当月のみに表示していた「🔄 更新」ボタンを、過去月にも表示・有効化する
2. **過去月の再取得**: 過去月の「更新」では、その月の月初〜月末を X API から全件再取得し、IndexedDB キャッシュを上書きする
3. **既存の当月差分更新は維持**: 当月の「更新」は従来どおり差分更新（`since_id`）で新着のみ取得してマージする

---

## 1. 現状（v3.53）と問題の詳細

過去月のポストは更新できない状態が、以下の4レイヤで意図的にブロックされている。

| レイヤ | ファイル | 該当箇所 | 現状の挙動 |
|--------|---------|---------|-----------|
| UI | `components/Timeline/MonthPagination.tsx` | L207 `{isCurrentMonth && onRefresh && (…)}` | 更新ボタンを当月のみ表示 |
| コンテナ | `components/Timeline/TimelineContainer.tsx` | L135 / L156 `onRefresh={isCurrent ? refresh : undefined}` | 当月以外は `onRefresh` を渡さない |
| フック | `hooks/useMonthlyTwitterData.ts` | L40-43 コメント「差分更新（当月のみ有効）」 | `refresh` は `loadTweets(true)` を呼ぶだけ |
| データ | `lib/data-provider-monthly.ts` | L70-74 `if (!isCurrent && forceRefresh)` ガード | 過去月の強制更新をキャッシュ返却で終了 |

### 問題

- 過去月の初回取得がレート制限や通信失敗などで**不完全だった場合**、それを補完する手段がない（キャッシュが古い・欠損したまま固定される）
- キャッシュが破損・古い内容のままでも、過去月は再取得できず、正しいデータに復旧できない
- 「更新」が当月だけに限られているのは一貫性に欠け、ユーザーにとって分かりにくい

なお、過去月ガード（`lib/data-provider-monthly.ts` L70-74）は直近の `PROPOSAL_V3.53.md` で「過去月の強制更新は無意味（データは変化しない）」として追加されたものだが、上記の理由から**再取得手段を残すべき**という方針に転換する。

---

## 2. 変更詳細

### 2.1 過去月の「更新」の挙動

過去月は対象期間（月初〜月末）が固定されており、新しいツイートが発生しない。そのため、過去月の「更新」は差分取得ではなく、**その月の全期間を API から再取得してキャッシュを上書き**する方式とする。

```
過去月の「🔄 更新」クリック
  → getMonthlyTweetsData(yearMonth, forceRefresh=true)
  → （isCurrent が false なので差分更新はしない）
  → fetchFullMonth(yearMonth, false)
      ├─ startTime = "YYYY-MM-01T00:00:00Z"（月初）
      ├─ endTime   = "YYYY-MM-末日T23:59:59Z"（月末）
      ├─ /api/tweets/fetch?startTime=…&endTime=… を呼び出し
      ├─ setMonthlyCache(yearMonth, tweets, false) でキャッシュを上書き
      └─ setLastFetchedAt() で最終取得日時を更新
```

既存の `fetchFullMonth(yearMonth, isCurrent)` がこの処理をそのまま実装済みのため、過去月ガードを外すだけで実現できる。

### 2.2 `lib/data-provider-monthly.ts`

**変更1: 過去月 forceRefresh ガードの削除（L70-74）**

```typescript
// 変更前
// ── 過去月の強制更新は無意味（データは変化しない） ──────────────────
if (!isCurrent && forceRefresh) {
  const cached = await getMonthlyCache(yearMonth);
  return cached?.tweets ?? [];
}
```

```typescript
// 変更後（このブロックを丸ごと削除）
// ※ 削除後、過去月 + forceRefresh は最終行の
//   `return await fetchFullMonth(yearMonth, false);` にフォールスルーし、
//   全件再取得 → キャッシュ上書きが実行される。
```

**変更2: 先頭の doc コメント更新（L1-10）**

```typescript
// 変更前
/**
 * 月単位のツイートデータ取得ロジック
 *
 * - 過去月: キャッシュがあればキャッシュから返す。なければ API 全件取得してキャッシュ保存。
 * - 当月:   キャッシュがあればキャッシュから返す。なければ API 全件取得してキャッシュ保存。
 *           forceRefresh=true の場合は差分取得（since_id）してキャッシュにマージ。
 * - 未来月: 呼び出し元（UI）で遷移不可とするため、ここでは空配列を返す。
 * ...
 */

// 変更後
/**
 * 月単位のツイートデータ取得ロジック
 *
 * - 過去月: キャッシュがあればキャッシュから返す。なければ API 全件取得してキャッシュ保存。
 *           forceRefresh=true の場合は全件再取得してキャッシュを上書き。
 * - 当月:   キャッシュがあればキャッシュから返す。なければ API 全件取得してキャッシュ保存。
 *           forceRefresh=true の場合は差分取得（since_id）してキャッシュにマージ。
 * - 未来月: 呼び出し元（UI）で遷移不可とするため、ここでは空配列を返す。
 * ...
 */
```

### 2.3 `components/Timeline/MonthPagination.tsx`

**変更1: `isCurrentMonth` prop の削除（L19-20, L73）**

```typescript
// 変更前（interface 内）
  /** 更新ボタンのコールバック（当月のみ表示） */
  onRefresh?: () => void;
  /** 当月フラグ */
  isCurrentMonth?: boolean;

// 変更後
  /** 更新ボタンのコールバック */
  onRefresh?: () => void;
```

```typescript
// 変更前（コンポーネント引数）
  onRefresh,
  isCurrentMonth = false,

// 変更後
  onRefresh,
```

**変更2: 更新ボタンの表示条件を緩和（L207）**

```typescript
// 変更前
{isCurrentMonth && onRefresh && (

// 変更後
{onRefresh && (
```

### 2.4 `components/Timeline/TimelineContainer.tsx`

**変更1: 不要な `isCurrent` 算出の削除（L7, L73）**

```typescript
// 変更前
import { getCurrentYearMonth, isCurrentMonth as checkIsCurrentMonth } from '@/lib/idb-cache';
// …
const isCurrent = checkIsCurrentMonth(currentYearMonth);

// 変更後
import { getCurrentYearMonth } from '@/lib/idb-cache';
// （isCurrent の算出行を削除）
```

**変更2: `onRefresh` を全月で渡す（L135, L156）と `isCurrentMonth` prop の削除（L134, L155）**

```typescript
// 変更前
<MonthPagination
  currentYearMonth={currentYearMonth}
  onMonthChange={setCurrentYearMonth}
  loading={loading}
  isCurrentMonth={isCurrent}
  onRefresh={isCurrent ? refresh : undefined}
  lastFetchedAt={lastFetchedAt}
  ...
/>

// 変更後
<MonthPagination
  currentYearMonth={currentYearMonth}
  onMonthChange={setCurrentYearMonth}
  loading={loading}
  onRefresh={refresh}
  lastFetchedAt={lastFetchedAt}
  ...
/>
```

※ 上記はメイン（L151-161）とエラー分岐（L130-140）の2箇所に適用する。

### 2.5 `hooks/useMonthlyTwitterData.ts`

**変更: コメント修正（L40-41）のみ（コード変更なし）**

```typescript
// 変更前
// 差分更新（当月のみ有効）
const refresh = useCallback(() => {
  loadTweets(true);
}, [loadTweets]);

// 変更後
// 再取得（当月: 差分更新 / 過去月: 全件再取得）
const refresh = useCallback(() => {
  loadTweets(true);
}, [loadTweets]);
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.54.md` | **新規** | 本変更要求書 |
| `lib/data-provider-monthly.ts` | **修正** | 過去月 forceRefresh ガード削除、doc コメント更新 |
| `components/Timeline/MonthPagination.tsx` | **修正** | 更新ボタンを全月表示、`isCurrentMonth` prop 削除 |
| `components/Timeline/TimelineContainer.tsx` | **修正** | `onRefresh` を全月で渡す、`isCurrent` 関連削除 |
| `hooks/useMonthlyTwitterData.ts` | **修正** | コメントのみ修正 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| 当月の更新（差分更新） | ✅ 変更なし | `since_id` による差分マージは従来どおり |
| 過去月の表示 | ✅ 変更なし | 初回は従来どおりキャッシュ優先 |
| タイムライン表示 | ✅ 変更なし | 表示ロジックは不変 |
| ハイライト表示 | ✅ 変更なし | 影響なし |
| API 呼出回数 | ⚠️ 増加の可能性 | 過去月の「更新」1回ごとに全件取得（従量課金）が発生 |
| 未来月 | ✅ 変更なし | UI 側で遷移不可（`data-provider-monthly.ts` の `isFutureMonth` ガードは維持） |

### 留意点

- **API コスト**: 過去月の「更新」は毎回その月の `searchAll` 全件取得を伴う。従量課金の X API を利用しているため、乱発は避けたい。必要に応じて今後「1日1回制限」などの制御を検討する（本変更では対象外）。
- **最終更新日時表示**: `lastFetchedAt` は現状グローバル1値（`metadata` ストア）のため、過去月にも「◯日前に更新」を表示すると、直近に更新した**別の月**の時刻が表示される可能性がある。軽微な既知の制約として許容する（月別の最終取得日時管理は必要になったら別途対応）。

---

## 5. 実装フェーズ案

### フェーズ1: データ層の修正
- [ ] `lib/data-provider-monthly.ts` の過去月ガード削除・doc コメント更新

### フェーズ2: UI 層の修正
- [ ] `components/Timeline/MonthPagination.tsx` の更新ボタン全月表示・`isCurrentMonth` 削除
- [ ] `components/Timeline/TimelineContainer.tsx` の `onRefresh` 統一・`isCurrent` 削除
- [ ] `hooks/useMonthlyTwitterData.ts` のコメント修正

### フェーズ3: 動作確認
- [ ] TypeScript コンパイル確認（`npm run build` / `tsc`）
- [ ] 過去月で「🔄 更新」ボタンが表示されることを確認
- [ ] 過去月の「更新」で全件再取得・キャッシュ上書きが行われることを確認（コンソールログ確認）
- [ ] 当月の「更新」が従来どおり差分更新で動作することを確認
- [ ] モバイル表示（スマホ）での目視確認

---

## 6. 次のステップ

この変更要求書（v3.54）の内容でご承認いただけましたら、フェーズ1から順に実装を進めます。

ご確認・ご意見をお願いいたします！🎉
