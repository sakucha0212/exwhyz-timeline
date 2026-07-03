# ExWHYZ-Timeline X API レート制限エラーのユーザー通知 変更要求書（v3.11）

## 📋 変更要件の整理

### v3.11での変更要件

- **X API のレート制限・月次利用量制限が発生した場合、ユーザーにわかりやすく通知する**:  
  現状、X API のレート制限（429 Too Many Requests）や月次利用量制限超過が発生しても、  
  エラーが握りつぶされて空配列またはキャッシュが返るだけで、ユーザーには「ツイートがない日」として表示される。  
  これらのエラーが発生した場合は、更新できない理由をユーザーに明示する警告バナーを表示する。

---

## 1. 変更の背景と目的

### 現状の課題

| 課題 | 詳細 |
|------|------|
| レート制限エラーが握りつぶされる | `data-provider.ts` の `catch` ブロックがエラーをスローせず空配列を返すため、`useTwitterData` の `error` state にセットされない |
| ユーザーに何も伝わらない | レート制限・月次利用量制限超過が発生しても「ツイートがない日」として表示されるだけで、なぜデータが取得できていないのかがわからない |
| 通常エラーとレート制限エラーが区別されない | 現状のエラーハンドリングはすべて同一の `error` state で管理されており、レート制限エラーをユーザーに通知できない |

### 変更の目的

- **レート制限エラーを検出して専用 state で管理する**: 通常エラーとレート制限エラーを区別し、適切なメッセージを表示する
- **警告バナーでユーザーに通知する**: 「最新のポストを取得」ボタンの近くに警告バナーを表示し、現在更新できないことを伝える
- **既存データは引き続き表示する**: レート制限中もキャッシュ済みのツイートは表示し続け、全画面エラーにはしない

---

## 2. UI設計

### 2.1 変更前（v3.10）

```
┌──────────────────────────────────────────────────────────┐
│              ExWHYZ Timeline                             │
│          輝きの軌跡 × あなたの思い出                       │
│          [最新のポストを取得]  ○○分前に更新               │
├──────────────────────────────────────────────────────────┤
│  （レート制限が発生しても何も表示されない）                  │
│  ツイートカラムには「この日はTweetがありません」が表示される  │
└──────────────────────────────────────────────────────────┘
```

### 2.2 変更後（v3.11）

```
┌──────────────────────────────────────────────────────────┐
│              ExWHYZ Timeline                             │
│          輝きの軌跡 × あなたの思い出                       │
│          [最新のポストを取得]  ○○分前に更新               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ⚠️ 現在ポストを更新できません。                    │   │  ← 警告バナー
│  └──────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│  （キャッシュ済みのツイートは引き続き表示される）            │
└──────────────────────────────────────────────────────────┘
```

### 2.3 警告バナーの仕様

- 黄色系の警告スタイル（`bg-yellow-900/50 border-yellow-700 text-yellow-300`）
- ⚠️ アイコン付きのメッセージ
- エラー種別（短期レート制限・月次利用量制限超過）に関わらず、**固定メッセージ**を表示する
- 「最新のポストを取得」ボタンの直下に表示

#### 表示メッセージ

すべての 429 エラーに対して以下の1種類のメッセージを表示する：

> **⚠️ 現在ポストを更新できません。**

#### 変更後の UI

```
┌──────────────────────────────────────────────────────────┐
│              ExWHYZ Timeline                             │
│          輝きの軌跡 × あなたの思い出                       │
│          [最新のポストを取得]  ○○分前に更新               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ⚠️ 現在ポストを更新できません。                    │   │  ← 警告バナー
│  └──────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│  （キャッシュ済みのツイートは引き続き表示される）            │
└──────────────────────────────────────────────────────────┘
```

---

## 3. 変更対象ファイルと変更内容

### 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `app/api/tweets/fetch/route.ts` | **修正** | X API のレート制限エラー（429）を検出し、`rateLimitError: true` を含む専用レスポンス（HTTP 429）を返す |
| `lib/data-provider.ts` | **修正** | HTTP 429 レスポンスを検出して `rateLimitError` プロパティ付きカスタムエラーをスローする |
| `hooks/useTwitterData.ts` | **修正** | `rateLimitError` 専用 state（`boolean`）を追加 |
| `components/RefreshButton.tsx` | **修正** | `rateLimitError` を受け取り、固定メッセージの警告バナーを表示する |
| `app/page.tsx` | **修正** | `rateLimitError` を `RefreshButton` に渡す |

---

## 4. 変更詳細

### 4.1 `app/api/tweets/fetch/route.ts` の変更

#### 変更前（v3.10）

```typescript
} catch (error: any) {
  console.error('[/api/tweets/fetch] エラー:', error);
  return NextResponse.json(
    { error: error.message ?? '不明なエラーが発生しました' },
    { status: 500 }
  );
}
```

#### 変更後（v3.11）

```typescript
} catch (error: any) {
  console.error('[/api/tweets/fetch] エラー:', error);

  // X API レート制限エラーの検出
  // twitter-api-v2 は ApiResponseError として throw し、rateLimitError プロパティが true になる
  // 短期レート制限・月次利用量制限超過のいずれも HTTP 429 で返る
  const isRateLimit =
    error?.rateLimitError === true ||
    error?.code === 429 ||
    error?.status === 429;

  if (isRateLimit) {
    return NextResponse.json(
      {
        error: '現在ポストを更新できません。',
        rateLimitError: true,
      },
      { status: 429 }
    );
  }

  return NextResponse.json(
    { error: error.message ?? '不明なエラーが発生しました' },
    { status: 500 }
  );
}
```

**変更点のまとめ:**
- `twitter-api-v2` の `ApiResponseError` からレート制限エラーを検出（短期・月次利用量制限超過の両方）
- HTTP 429 レスポンスとして `rateLimitError: true` を返す（リセット時刻は不要なため含めない）

---

### 4.2 `lib/data-provider.ts` の変更

#### 変更前（v3.10）

```typescript
const response = await fetch(url);

if (!response.ok) {
  throw new Error(`API エラー: ${response.status}`);
}

const data = await response.json();
const tweets = data.tweets ?? [];
```

```typescript
} catch (error) {
  console.error('[data-provider] getTweetsData エラー:', error);
  // エラー時はキャッシュを返す。キャッシュもなければ空配列を返す（モックは返さない）
  return getCachedTweets() || [];
}
```

#### 変更後（v3.11）

```typescript
const response = await fetch(url);
const data = await response.json();

// レート制限エラーの検出（HTTP 429）
if (response.status === 429 && data.rateLimitError) {
  const err = new Error(data.error ?? '現在ポストを更新できません。');
  (err as any).rateLimitError = true;
  throw err;
}

if (!response.ok) {
  throw new Error(`API エラー: ${response.status}`);
}

const tweets = data.tweets ?? [];
```

```typescript
} catch (error) {
  console.error('[data-provider] getTweetsData エラー:', error);

  // レート制限エラーは呼び出し元（useTwitterData）に伝播させる
  if ((error as any).rateLimitError) {
    throw error;
  }

  // その他のエラー時はキャッシュを返す。キャッシュもなければ空配列を返す（モックは返さない）
  return getCachedTweets() || [];
}
```

**変更点のまとめ:**
- HTTP 429 レスポンスを検出し、`rateLimitError` プロパティ付きのカスタムエラーをスロー
- `catch` ブロックでレート制限エラーのみ `throw` して呼び出し元に伝播させる
- その他のエラーは従来通りキャッシュを返す（後方互換）

---

### 4.3 `hooks/useTwitterData.ts` の変更

#### 変更前（v3.10）

```typescript
export function useTwitterData() {
  const [tweets, setTweets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const loadTweets = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getTweetsData(forceRefresh);
      setTweets(data);
      setLastFetchedAt(getLastFetchedAt());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  // ...
  return { tweets, loading, error, lastFetchedAt, refresh };
}
```

#### 変更後（v3.11）

```typescript
export function useTwitterData() {
  const [tweets, setTweets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<boolean>(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const loadTweets = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setRateLimitError(false);

    try {
      const data = await getTweetsData(forceRefresh);
      setTweets(data);
      setLastFetchedAt(getLastFetchedAt());
    } catch (err: any) {
      if (err?.rateLimitError) {
        // レート制限エラー: キャッシュ済みデータは維持しつつ警告フラグをセット
        setRateLimitError(true);
        // キャッシュがあれば表示を維持する
        const cached = getCachedTweets();
        if (cached) setTweets(cached);
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };
  // ...
  return { tweets, loading, error, rateLimitError, lastFetchedAt, refresh };
}
```

**変更点のまとめ:**
- `rateLimitError` 専用 state を `boolean`（`false` / `true`）で追加（シンプルなフラグ）
- レート制限エラー時はキャッシュ済みデータを維持しつつ `rateLimitError = true` をセット
- 通常エラーは従来通り `error` state にセット
- `return` に `rateLimitError` を追加

---

### 4.4 `components/RefreshButton.tsx` の変更

#### 変更前（v3.10）

```typescript
interface RefreshButtonProps {
  onRefresh: () => void;
  lastFetchedAt: string | null;
}

export default function RefreshButton({ onRefresh, lastFetchedAt }: RefreshButtonProps) {
  // ...
  return (
    <div className="flex items-center justify-center gap-4">
      <button ...>最新のポストを取得</button>
      <span className="text-gray-500 text-sm">{formatLastFetchedAt(lastFetchedAt)}</span>
    </div>
  );
}
```

#### 変更後（v3.11）

```typescript
interface RefreshButtonProps {
  onRefresh: () => void;
  lastFetchedAt: string | null;
  rateLimitError?: boolean;  // ← 追加
}

export default function RefreshButton({ onRefresh, lastFetchedAt, rateLimitError = false }: RefreshButtonProps) {
  // ...

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-4">
        <button ...>最新のポストを取得</button>
        <span className="text-gray-500 text-sm">{formatLastFetchedAt(lastFetchedAt)}</span>
      </div>

      {/* レート制限警告バナー */}
      {rateLimitError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-300 text-sm max-w-md">
          <span>⚠️</span>
          <p className="font-medium">現在ポストを更新できません。</p>
        </div>
      )}
    </div>
  );
}
```

**変更点のまとめ:**
- `rateLimitError?: boolean` prop を追加（デフォルト `false`）
- `rateLimitError` が `true` の場合、ボタンの下に黄色の警告バナーを表示
- 表示メッセージは「⚠️ 現在ポストを更新できません。」の1行のみ（エラー種別・リセット時刻は表示しない）

---

### 4.5 `app/page.tsx` の変更

#### 変更前（v3.10）

```typescript
const { tweets, loading, error, lastFetchedAt, refresh } = useTwitterData();
// ...
<RefreshButton onRefresh={refresh} lastFetchedAt={lastFetchedAt} />
```

#### 変更後（v3.11）

```typescript
const { tweets, loading, error, rateLimitError, lastFetchedAt, refresh } = useTwitterData();
// ...
<RefreshButton onRefresh={refresh} lastFetchedAt={lastFetchedAt} rateLimitError={rateLimitError} />
```

**変更点のまとめ:**
- `useTwitterData` から `rateLimitError`（`boolean`）を取得
- `RefreshButton` に `rateLimitError={rateLimitError}` を渡す

---

## 5. エラーの種類と挙動まとめ

### 5.1 X API の 429 エラーについて

X API Developer Portal（X API Console）で設定できる月次利用量制限（Usage Cap）を超えた場合も、短期レート制限と同様に **HTTP 429** が返ります。ユーザーへの表示はエラー種別に関わらず同一のメッセージとします。

| エラー種別 | HTTP | 備考 |
|-----------|------|------|
| 短期レート制限 | 429 | 15分〜数時間後にリセット |
| 月次利用量制限超過 | 429 | 翌月1日にリセット |

### 5.2 エラー種別と挙動まとめ

| エラー種別 | 検出方法 | ユーザーへの表示 | キャッシュ |
|-----------|---------|----------------|---------|
| レート制限・月次利用量制限超過（429） | `response.status === 429 && data.rateLimitError` | 警告バナー（黄色）「⚠️ 現在ポストを更新できません。」 | 維持して表示 |
| その他の API エラー | `!response.ok`（429以外） | 全画面エラー表示（赤） | 返却して表示 |
| ネットワークエラー等 | `catch` で捕捉 | 全画面エラー表示（赤） | 返却して表示 |

---

## 6. 処理の流れ（v3.11）

```
1. 「最新のポストを取得」ボタン押下
   └─ loadTweets(true) 呼び出し

2. data-provider.ts が /api/tweets/fetch を呼び出し

3-A. 正常時
   └─ tweets が返り、キャッシュ更新 → 表示更新

3-B. レート制限エラー時（HTTP 429）
   ├─ route.ts が rateLimitError: true を含む 429 レスポンスを返す
   ├─ data-provider.ts が rateLimitError 付きエラーをスロー
   ├─ useTwitterData の catch で rateLimitError = true をセット
   ├─ キャッシュ済みデータがあれば tweets state を維持
   └─ RefreshButton が「⚠️ 現在ポストを更新できません。」の警告バナーを表示

3-C. その他エラー時
   ├─ data-provider.ts がキャッシュを返す（エラーをスローしない）
   └─ 従来通りの動作（エラー表示なし、キャッシュ表示）
```

---

## 7. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `useTwitterData` の戻り値 | ✅ 後方互換 | `rateLimitError` を追加するのみ。既存の `tweets`, `loading`, `error`, `lastFetchedAt`, `refresh` は変更なし |
| `RefreshButton` の props | ✅ 後方互換 | `rateLimitError` はオプショナル（デフォルト `false`）のため既存の呼び出しに影響なし |
| モックモード (`NEXT_PUBLIC_USE_MOCK=true`) | ✅ 変更なし | モックモードでは X API を呼び出さないため、レート制限エラーは発生しない |
| キャッシュ機構 | ✅ 変更なし | レート制限時もキャッシュ済みデータは維持される |

---

## 8. 実装フェーズ案

### フェーズ1: `app/api/tweets/fetch/route.ts` の修正
- [ ] レート制限エラー（`rateLimitError`）の検出ロジックを追加
- [ ] HTTP 429 レスポンスに `rateLimitError: true` を含める

### フェーズ2: `lib/data-provider.ts` の修正
- [ ] HTTP 429 レスポンスを検出して `rateLimitError` プロパティ付きエラーをスロー
- [ ] `catch` ブロックでレート制限エラーのみ `throw` するよう修正

### フェーズ3: `hooks/useTwitterData.ts` の修正
- [ ] `rateLimitError` 専用 state（`boolean`）を追加
- [ ] レート制限エラー時の処理（キャッシュ維持 + `rateLimitError = true` セット）を実装
- [ ] `return` に `rateLimitError` を追加

### フェーズ4: `components/RefreshButton.tsx` の修正
- [ ] `rateLimitError?: boolean` prop を追加
- [ ] 警告バナーの UI を実装（黄色スタイル + 「現在ポストを更新できません。」の固定メッセージ）

### フェーズ5: `app/page.tsx` の修正
- [ ] `useTwitterData` から `rateLimitError` を取得
- [ ] `RefreshButton` に `rateLimitError` を渡す

### フェーズ6: 動作確認
- [ ] レート制限・月次利用量制限超過エラー時に「⚠️ 現在ポストを更新できません。」の警告バナーが表示されるか確認
- [ ] キャッシュ済みデータが引き続き表示されるか確認
- [ ] 通常エラー時の動作が変わっていないか確認
- [ ] モックモードでの動作確認

---

## 9. 次のステップ

この変更要求書（v3.11）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`app/api/tweets/fetch/route.ts` の修正** — レート制限エラーの検出と専用レスポンス
2. **`lib/data-provider.ts` の修正** — カスタムエラーのスロー
3. **`hooks/useTwitterData.ts` の修正** — `rateLimitError` state の追加
4. **`components/RefreshButton.tsx` の修正** — 警告バナーの実装
5. **`app/page.tsx` の修正** — `rateLimitError` の伝播
6. **動作確認** — レート制限時の表示確認

ご確認・ご意見をお願いいたします！🎉
