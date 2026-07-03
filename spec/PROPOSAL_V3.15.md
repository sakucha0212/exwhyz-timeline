# ExWHYZ-Timeline 更新ボタンの1日1回制限 変更要求書（v3.15）

## 📋 変更要件の整理

### v3.15での変更要件

- **更新ボタンの実行を1日1回に制限する**:  
  「最新のポストを取得」ボタンを押すたびに X API を呼び出してツイート情報を再取得しているが、  
  API 利用料金が呼び出し回数に応じて課金されるため、**1日1回のみ更新を実行できる**ように制限を設ける。

---

## 1. 現状の仕組み（v3.14）

| ファイル | 役割 |
|---------|------|
| `components/RefreshButton.tsx` | 更新ボタンのUI。クリックで `onRefresh()` を呼び出す |
| `hooks/useTwitterData.ts` | `refresh()` → `loadTweets(forceRefresh=true)` → API呼び出し |
| `lib/cache.ts` | `localStorage` に `lastFetchedAt`（最終取得日時）を保存・取得する関数を持つ |
| `app/api/tweets/fetch/route.ts` | サーバー側 API エンドポイント。X API を呼び出す |

`lib/cache.ts` にはすでに `getLastFetchedAt()` / `setLastFetchedAt()` が実装されており、  
最終取得日時が `localStorage` に保存されています。この仕組みを活用して制限を実装します。

---

## 2. 変更詳細

### 2.1 `lib/cache.ts` — 1日1回制限チェック関数の追加

最終取得日時と現在日時を比較し、**同じ日付であれば更新済み**と判定する関数を追加します。

```ts
/**
 * 本日すでに更新済みかどうかを判定する
 * @returns true: 本日更新済み（更新不可）/ false: 未更新（更新可能）
 */
export function isAlreadyFetchedToday(): boolean {
  const lastFetchedAt = getLastFetchedAt();
  if (!lastFetchedAt) return false;

  const lastDate = new Date(lastFetchedAt);
  const today = new Date();

  return (
    lastDate.getFullYear() === today.getFullYear() &&
    lastDate.getMonth()    === today.getMonth()    &&
    lastDate.getDate()     === today.getDate()
  );
}
```

### 2.2 `hooks/useTwitterData.ts` — 更新前に制限チェックを追加

`refresh()` 呼び出し時に `isAlreadyFetchedToday()` を確認し、  
本日更新済みであれば API を呼ばずに `dailyLimitError` フラグをセットします。

**変更前（v3.14）:**

```ts
const refresh = () => loadTweets(true);

return { tweets, loading, error, rateLimitError, lastFetchedAt, refresh };
```

**変更後（v3.15）:**

```ts
import { getCachedTweets, getLastFetchedAt, isAlreadyFetchedToday } from '@/lib/cache';

const [dailyLimitError, setDailyLimitError] = useState<boolean>(false);

const refresh = () => {
  if (isAlreadyFetchedToday()) {
    // 本日更新済みの場合はフラグをセットしてAPIを呼ばない
    setDailyLimitError(true);
    return;
  }
  setDailyLimitError(false);
  loadTweets(true);
};

return { tweets, loading, error, rateLimitError, dailyLimitError, lastFetchedAt, refresh };
```

### 2.3 `components/RefreshButton.tsx` — 制限中のUI表示

`dailyLimitError` prop を追加し、本日更新済みの場合はボタンを無効化してメッセージを表示します。

**変更前（v3.14）:**

```tsx
interface RefreshButtonProps {
  onRefresh: () => void;
  lastFetchedAt: string | null;
  rateLimitError?: boolean;
}
```

**変更後（v3.15）:**

```tsx
interface RefreshButtonProps {
  onRefresh: () => void;
  lastFetchedAt: string | null;
  rateLimitError?: boolean;
  dailyLimitError?: boolean;  // 追加
}
```

ボタンの `disabled` 制御と制限中メッセージの表示:

```tsx
<button
  onClick={onRefresh}
  disabled={dailyLimitError}
  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium
    ${dailyLimitError
      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
      : 'bg-blue-600 hover:bg-blue-700 text-white'
    }`}
>
  最新のポストを取得
</button>

{/* 1日1回制限メッセージ */}
{dailyLimitError && (
  <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-400 text-sm max-w-md">
    <span>📅</span>
    <p className="font-medium">本日はすでに更新済みです。次回は明日以降に更新できます。</p>
  </div>
)}
```

### 2.4 `app/page.tsx` — `dailyLimitError` を `RefreshButton` に渡す

```tsx
const { tweets, loading, error, rateLimitError, dailyLimitError, lastFetchedAt, refresh } = useTwitterData();

// ...

<RefreshButton
  onRefresh={refresh}
  lastFetchedAt={lastFetchedAt}
  rateLimitError={rateLimitError}
  dailyLimitError={dailyLimitError}
/>
```

---

## 3. UI仕様（更新制限中の表示）

| 状態 | ボタン | メッセージ |
|------|--------|-----------|
| 更新可能（初回・翌日以降） | 青色・有効 | `${N}時間前に更新` など |
| **本日更新済み（新規）** | グレー・無効（`disabled`） | 「📅 本日はすでに更新済みです。次回は明日以降に更新できます。」 |
| レート制限中（既存） | 青色・有効 | 「⚠️ 現在ポストを更新できません。」 |

---

## 4. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/cache.ts` | **追加** | `isAlreadyFetchedToday()` 関数を追加 |
| `hooks/useTwitterData.ts` | **修正** | `dailyLimitError` state と制限チェックを追加 |
| `components/RefreshButton.tsx` | **修正** | `dailyLimitError` prop を追加し、制限中UIを表示 |
| `app/page.tsx` | **修正** | `dailyLimitError` を `RefreshButton` に渡す |

---

## 5. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `localStorage` のキー | ✅ 変更なし | 既存の `exwhyz_timeline_tweets_last_fetched` を流用 |
| 初回アクセス時 | ✅ 問題なし | `lastFetchedAt` が `null` の場合は更新可能 |
| 日付をまたいだ場合 | ✅ 問題なし | 翌日になれば自動的に更新可能になる |
| レート制限エラー（既存） | ✅ 変更なし | `rateLimitError` の挙動は変更なし |
| モックモード | ✅ 変更なし | `useMock === true` の場合は更新ボタン自体が非表示 |

---

## 6. 実装フェーズ案

### フェーズ1: `lib/cache.ts` の修正
- [ ] `isAlreadyFetchedToday()` 関数を追加

### フェーズ2: `hooks/useTwitterData.ts` の修正
- [ ] `dailyLimitError` state を追加
- [ ] `refresh()` に `isAlreadyFetchedToday()` チェックを追加
- [ ] 戻り値に `dailyLimitError` を追加

### フェーズ3: `components/RefreshButton.tsx` の修正
- [ ] `dailyLimitError` prop を追加
- [ ] ボタンの `disabled` 制御を追加
- [ ] 制限中メッセージの表示を追加

### フェーズ4: `app/page.tsx` の修正
- [ ] `dailyLimitError` を `useTwitterData` から取得
- [ ] `RefreshButton` に `dailyLimitError` を渡す

---

## 7. 次のステップ

この変更要求書（v3.15）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`lib/cache.ts`** — `isAlreadyFetchedToday()` 関数を追加
2. **`hooks/useTwitterData.ts`** — `dailyLimitError` state と制限チェックを追加
3. **`components/RefreshButton.tsx`** — 制限中UIを追加
4. **`app/page.tsx`** — `dailyLimitError` を渡す

ご確認・ご意見をお願いいたします！🎉
