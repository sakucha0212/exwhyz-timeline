# ExWHYZ-Timeline 年月ジャンプナビゲーション 変更要求書（v3.7）

## 📋 変更要件の整理

### v3.7での変更要件

- **スクロール中に特定の年・月へジャンプできるナビゲーションを追加する**:  
  日付見出しごとに縦方向に画面が続くため、スクロール量が多い。  
  スクロール中でも常に画面上部に固定表示されるナビゲーションバーから、  
  「年」→「月」の2段階ドロップダウンで目的の日付エントリへ即座にジャンプできるようにする。

---

## 1. 変更の背景と目的

### 現状の課題

| 課題 | 詳細 |
|------|------|
| スクロール量が多い | `timeline.json` には多数の日付エントリが存在し、縦方向に長いページになっている |
| 目的の日付へのアクセスが困難 | 特定の年・月のエントリを見たい場合、延々とスクロールし続ける必要がある |
| スクロール中のナビゲーション手段がない | 現状はページ内ジャンプの仕組みが存在しない |

### 変更の目的

- **スクロール中でも常に年月ナビゲーションを表示する**: 画面上部に固定（sticky）表示することで、どこをスクロールしていても操作可能にする
- **2段階ドロップダウンで直感的に操作できる**: 「年」を選択すると「月」の選択肢が絞り込まれ、月を選択すると対象エントリへスムーズスクロールする
- **既存の表示ロジックに影響を与えない**: タイムラインの表示内容・順序・スタイルは変更しない

---

## 2. UI設計

### 2.1 ナビゲーションバーの外観

```
┌─────────────────────────────────────────────────────────┐
│  📅 ジャンプ:  [2026年 ▼]  [8月 ▼]                      │  ← 画面上部に sticky 固定
└─────────────────────────────────────────────────────────┘
│                                                           │
│  📅 2026年8月31日（月）                                   │  ← ジャンプ先
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │  活動情報         │  │  ポスト           │             │
│  └──────────────────┘  └──────────────────┘             │
│                                                           │
│  📅 2026年8月15日（土）                                   │
│  ...                                                      │
```

### 2.2 操作フロー

```
1. ユーザーが「年」ドロップダウンを選択
   └─ 選択した年に存在する「月」のみが「月」ドロップダウンに表示される

2. ユーザーが「月」ドロップダウンを選択
   └─ 対象の年月に最も近い DayEntry へスムーズスクロール（scrollIntoView）
```

### 2.3 ナビゲーションバーのスタイル

- 背景色: `bg-black`（ページ背景と統一）
- ボーダー: 下部に `border-b border-gray-700`
- `z-index`: タイムラインコンテンツより前面に表示（`z-50`）
- `position: sticky; top: 0`

---

## 3. 変更対象ファイルと変更内容

### 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `components/Timeline/YearMonthNav.tsx` | **新規作成** | 年月ジャンプナビゲーションコンポーネント |
| `components/Timeline/TimelineContainer.tsx` | **修正** | `YearMonthNav` を追加、各 `DayEntry` に `id` を付与 |
| `components/Timeline/DayEntry.tsx` | **修正** | `id` prop を受け取り、ルート要素に付与 |

---

## 4. 変更詳細

### 4.1 新規作成: `components/Timeline/YearMonthNav.tsx`

年月ジャンプナビゲーションコンポーネント。

```typescript
'use client';

import { useState, useMemo } from 'react';

interface YearMonthNavProps {
  /** タイムラインに存在する全日付（YYYY-MM-DD 形式、ソート済み） */
  dates: string[];
}

export default function YearMonthNav({ dates }: YearMonthNavProps) {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // 年一覧を生成（重複排除・降順）
  const years = useMemo(() => {
    const yearSet = new Set(dates.map(d => d.slice(0, 4)));
    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
  }, [dates]);

  // 選択中の年に存在する月一覧を生成
  const months = useMemo(() => {
    if (!selectedYear) return [];
    const monthSet = new Set(
      dates
        .filter(d => d.startsWith(selectedYear))
        .map(d => d.slice(5, 7))
    );
    return Array.from(monthSet).sort((a, b) => Number(b) - Number(a));
  }, [dates, selectedYear]);

  // 年が変わったら月をリセット
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth('');
  };

  // 月が選択されたらスクロール
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (!selectedYear || !month) return;

    // 対象年月の最初の DayEntry の id へスクロール
    const targetPrefix = `${selectedYear}-${month}`;
    const targetDate = dates.find(d => d.startsWith(targetPrefix));
    if (targetDate) {
      const el = document.getElementById(`date-${targetDate}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-black border-b border-gray-700 py-3 px-4">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <span className="text-gray-400 text-sm whitespace-nowrap">📅 ジャンプ:</span>

        {/* 年ドロップダウン */}
        <select
          value={selectedYear}
          onChange={(e) => handleYearChange(e.target.value)}
          className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">年を選択</option>
          {years.map(year => (
            <option key={year} value={year}>{year}年</option>
          ))}
        </select>

        {/* 月ドロップダウン（年が選択されている場合のみ有効） */}
        <select
          value={selectedMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          disabled={!selectedYear}
          className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <option value="">月を選択</option>
          {months.map(month => (
            <option key={month} value={month}>{Number(month)}月</option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

---

### 4.2 `components/Timeline/TimelineContainer.tsx` の変更

#### 変更前（v3.6）

```typescript
return (
  <div className="space-y-8">
    {sortedDates.map((date) => (
      <DayEntry
        key={date}
        date={date}
        events={getEventsForDate(date)}
        tweets={getTweetsForDate(date)}
        categories={categories}
      />
    ))}
  </div>
);
```

#### 変更後（v3.7）

```typescript
import YearMonthNav from './YearMonthNav';

// ...（既存のロジックはそのまま）

return (
  <>
    {/* 年月ジャンプナビゲーション */}
    <YearMonthNav dates={sortedDates} />

    {/* タイムライン本体 */}
    <div className="space-y-8 mt-4">
      {sortedDates.map((date) => (
        <DayEntry
          key={date}
          id={`date-${date}`}
          date={date}
          events={getEventsForDate(date)}
          tweets={getTweetsForDate(date)}
          categories={categories}
        />
      ))}
    </div>
  </>
);
```

**変更点のまとめ:**
- `YearMonthNav` コンポーネントをタイムライン本体の直前に追加
- 各 `DayEntry` に `id={`date-${date}`}` を付与（例: `id="date-2026-08-31"`）
- `<div>` を `<>` フラグメントに変更し、ナビゲーションとタイムラインを並列配置

---

### 4.3 `components/Timeline/DayEntry.tsx` の変更

#### 変更前（v3.6）

```typescript
interface DayEntryProps {
  date: string;
  events: Event[];
  tweets: Tweet[];
  categories: Category[];
}

export default function DayEntry({ date, events, tweets, categories }: DayEntryProps) {
  // ...
  return (
    <div className="mb-8">
      {/* 日付ヘッダー */}
      ...
    </div>
  );
}
```

#### 変更後（v3.7）

```typescript
interface DayEntryProps {
  id?: string;          // ← 追加: スクロールジャンプ用 id
  date: string;
  events: Event[];
  tweets: Tweet[];
  categories: Category[];
}

export default function DayEntry({ id, date, events, tweets, categories }: DayEntryProps) {
  // ...
  return (
    <div id={id} className="mb-8">   {/* ← id を付与 */}
      {/* 日付ヘッダー */}
      ...
    </div>
  );
}
```

**変更点のまとめ:**
- `DayEntryProps` に `id?: string` を追加
- ルート `<div>` に `id={id}` を付与

---

## 5. 処理の流れ（v3.7）

```
1. TimelineContainer がレンダリング
   ├─ sortedDates（全表示日付の配列）を生成
   ├─ YearMonthNav に sortedDates を渡す
   └─ 各 DayEntry に id="date-YYYY-MM-DD" を付与してレンダリング

2. ユーザーが YearMonthNav で「年」を選択
   └─ 選択した年に存在する月のみが「月」ドロップダウンに表示される

3. ユーザーが「月」を選択
   ├─ sortedDates から "YYYY-MM" で始まる最初の日付を検索
   ├─ document.getElementById("date-YYYY-MM-DD") で対象要素を取得
   └─ scrollIntoView({ behavior: 'smooth', block: 'start' }) でスムーズスクロール

4. ナビゲーションバーは sticky のため、スクロール後も画面上部に固定表示
```

---

## 6. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `TimelineContainer` の props | ✅ 維持 | `timeline`, `categories`, `userTweets` は変更なし |
| `DayEntry` の props | ✅ 後方互換 | `id` はオプショナル（`id?`）のため既存の呼び出しに影響なし |
| タイムラインの表示内容・順序 | ✅ 維持 | 表示ロジックは変更なし |
| `YearMonthNav` | ✅ 新規追加のみ | 既存コンポーネントへの影響なし |
| `app/page.tsx` | ✅ 変更なし | `TimelineContainer` の呼び出し方は変更なし |
| X API連携・キャッシュ機構 | ✅ 変更なし | フロントエンドのみの変更 |

---

## 7. 実装フェーズ案

### フェーズ1: `DayEntry.tsx` の修正
- [ ] `id?: string` prop を追加
- [ ] ルート `<div>` に `id={id}` を付与

### フェーズ2: `YearMonthNav.tsx` の新規作成
- [ ] 年一覧・月一覧の生成ロジック実装
- [ ] 年選択時に月をリセットする処理実装
- [ ] 月選択時の `scrollIntoView` ジャンプ処理実装
- [ ] sticky スタイルの適用

### フェーズ3: `TimelineContainer.tsx` の修正
- [ ] `YearMonthNav` のインポートと配置
- [ ] 各 `DayEntry` に `id` prop を追加

### フェーズ4: 動作確認
- [ ] 年ドロップダウンに正しい年一覧が表示されるか確認
- [ ] 月ドロップダウンが選択した年の月のみに絞り込まれるか確認
- [ ] 月選択時に対象エントリへスムーズスクロールするか確認
- [ ] スクロール中もナビゲーションバーが画面上部に固定されているか確認
- [ ] モバイル表示での動作確認

---

## 8. 次のステップ

この変更要求書（v3.7）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`components/Timeline/DayEntry.tsx` の修正** — `id` prop の追加
2. **`components/Timeline/YearMonthNav.tsx` の新規作成** — ナビゲーションコンポーネント実装
3. **`components/Timeline/TimelineContainer.tsx` の修正** — ナビゲーション組み込みと `id` 付与
4. **動作確認** — スクロールジャンプの動作確認

ご確認・ご意見をお願いいたします！🎉
