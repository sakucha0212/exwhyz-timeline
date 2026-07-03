# ExWHYZ-Timeline キャッシュ仕様変更 変更要求書（v3.2）

## 📋 変更要件の整理

### v3.2での変更要件

- **localStorageキャッシュの有効期限を撤廃する**: 24時間で失効する設計を廃止し、明示的に更新ボタンを押すまで永続的にlocalStorageのデータを使用する

---

## 1. 変更の背景と目的

### 現状の課題（v3.1の設計）

**v3.1時点の `lib/cache.ts` にある有効期限設定**:

```typescript
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間

export function getCachedTweets() {
  const age = Date.now() - parseInt(timestamp, 10);
  if (age > CACHE_DURATION) {
    clearCache();   // ← 24時間を超えたら自動削除
    return null;    // ← APIを再呼び出しさせる
  }
}
```

### なぜ24時間失効が問題なのか

v3.1では `/2/tweets/search/all` で **2022年6月〜現在の全件** を取得する設計に変わっている。
24時間ごとにキャッシュが失効すると、毎日最初のアクセスで「2022年〜現在の全件」を再取得してしまう。

| 項目 | v3.0（userTimeline） | v3.1（search/all 全件） |
|------|---------------------|----------------------|
| 取得件数 | 最新100件程度 | 2022年〜現在の数千〜数万件 |
| 24時間失効のコスト | 低い（少量の再取得） | **高い（全件の再取得）** |
| 失効の必要性 | あり（毎日新しい投稿を反映） | **なし（更新ボタンで差分取得できる）** |

### 変更の目的

- **APIコストの削減**: 全件再取得を毎日行わないようにする
- **意図した更新のみ行う**: 更新ボタンを押したときだけデータが更新される、予測可能な動作にする
- **設計の一貫性**: v3.1で導入した「初回全件 → 以降は差分更新ボタン」というフローと整合させる

---

## 2. 変更仕様

### キャッシュの有効期限

| 項目 | v3.1（変更前） | v3.2（変更後） |
|------|-------------|-------------|
| 有効期限 | 24時間 | **なし（永続）** |
| 自動失効 | あり | **なし** |
| データ更新タイミング | ① 初回 ② 24時間経過後の再アクセス ③ 更新ボタン | **① 初回 ② 更新ボタンのみ** |
| キャッシュのクリア | 24時間経過で自動 or `clearCache()` | **`clearCache()` のみ** |

### 動作フロー（v3.2）

```
アクセス
  │
  ├─ キャッシュあり（永続）→ localStorageから返す（API呼ばない）
  │
  ├─ キャッシュなし        → X API 全件取得（2022-06-01〜現在）
  │                          → localStorageに保存（失効なし）
  │
  └─ 更新ボタン押下        → X API 差分取得（前回取得日時〜現在）
                             → localStorageにマージ保存
```

---

## 3. 変更詳細

### 3.1 `lib/cache.ts` の変更

#### 変更前（v3.1）

```typescript
const CACHE_KEY = 'exwhyz_timeline_tweets';
const CACHE_TIMESTAMP_KEY = 'exwhyz_timeline_tweets_timestamp';
const CACHE_LAST_FETCHED_KEY = 'exwhyz_timeline_tweets_last_fetched';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間

export function getCachedTweets() {
  const cached = localStorage.getItem(CACHE_KEY);
  const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (!cached || !timestamp) return null;
  const age = Date.now() - parseInt(timestamp, 10);
  if (age > CACHE_DURATION) { clearCache(); return null; }
  return JSON.parse(cached);
}

export function setCachedTweets(tweets: any[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(tweets));
  localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString()); // ← 削除
}

export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);                    // ← 削除
  localStorage.removeItem(CACHE_LAST_FETCHED_KEY);
}

export function getCacheAge() { ... }  // ← 削除（有効期限なしのため不要）
```

#### 変更後（v3.2）

```typescript
const CACHE_KEY = 'exwhyz_timeline_tweets';
const CACHE_LAST_FETCHED_KEY = 'exwhyz_timeline_tweets_last_fetched';

export function getCachedTweets() {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
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
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

export function clearCache() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_LAST_FETCHED_KEY);
}

// getCacheAge() は削除
```

---

### 3.2 `hooks/useTwitterData.ts` の変更

`getCacheAge()` の削除に伴い、`cacheAge`（経過ミリ秒）→ `lastFetchedAt`（ISO 8601文字列）に変更する。

#### 変更前（v3.1）

```typescript
import { getCacheAge } from '@/lib/cache';
// ...
const [cacheAge, setCacheAge] = useState<number | null>(null);
// ...
setCacheAge(getCacheAge());
// ...
return { tweets, loading, error, cacheAge, refresh };
```

#### 変更後（v3.2）

```typescript
import { getLastFetchedAt } from '@/lib/cache';
// ...
const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
// ...
setLastFetchedAt(getLastFetchedAt());
// ...
return { tweets, loading, error, lastFetchedAt, refresh };
```

---

## 4. 変更ファイル一覧

| ファイル | 変更種別 | 主な変更内容 |
|---------|---------|------------|
| `lib/cache.ts` | 修正 | `CACHE_DURATION`・`CACHE_TIMESTAMP_KEY` を削除。有効期限チェックロジックを削除。`getCacheAge()` を削除 |
| `hooks/useTwitterData.ts` | 修正 | `getCacheAge` → `getLastFetchedAt` に変更。戻り値 `cacheAge` → `lastFetchedAt` に変更 |

---

## 5. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| キャッシュキー (`exwhyz_timeline_tweets`) | ✅ 維持 | 既存のlocalStorageデータはそのまま利用可能 |
| モックモード (`NEXT_PUBLIC_USE_MOCK=true`) | ✅ 維持 | キャッシュロジックを通らないため影響なし |
| 初回取得・差分更新フロー | ✅ 維持 | `data-provider.ts` の変更なし |

---

## 6. 次のステップ

1. **`lib/cache.ts` の修正** — `CACHE_DURATION`・タイムスタンプ関連の削除
2. **`hooks/useTwitterData.ts` の修正** — `getCacheAge` → `getLastFetchedAt` への切り替え
3. **動作確認** — 初回取得後にブラウザを再起動してもAPIが呼ばれないことを確認

ご確認・ご意見をお願いいたします！🎉
