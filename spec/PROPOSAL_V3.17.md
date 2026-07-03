# ExWHYZ-Timeline 日付見出し表示範囲の変更 変更要求書（v3.17）

## 📋 変更要件の整理

### v3.17での変更要件

1. **日付見出しの表示範囲を固定期間に変更**: 「活動情報がある前後2日間のみ表示」という制約を外し、2022年6月〜2026年9月30日の全日付を表示する
2. **アーカイブ終了日の定数追加**: `ARCHIVE_END_DATE_CLIENT` を `lib/constants.ts` に追加し、月ナビゲーションの上限制御に使用する

---

## 1. 現状の仕組み（v3.16）

### 日付見出し生成ロジック（`TimelineContainer.tsx`）

```ts
// 環境変数から前後表示日数を取得（デフォルト2日）
const surroundingDays = ...;

// 選択月に該当するイベント日付を抽出
const monthEvents = timeline.filter((day) => day.date.startsWith(currentYearMonth));

// イベントがある日の前後 surroundingDays 日間のみ日付を追加
monthEvents.forEach((day) => {
  const eventDate = new Date(day.date);
  for (let i = -surroundingDays; i <= surroundingDays; i++) {
    const targetDate = new Date(eventDate);
    targetDate.setDate(eventDate.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0];
    if (dateStr.startsWith(currentYearMonth)) {
      allDisplayDates.add(dateStr);
    }
  }
});

// ツイートがある日付も追加
tweets.forEach((day) => {
  if (day.date.startsWith(currentYearMonth)) {
    allDisplayDates.add(day.date);
  }
});
```

**現状の課題:**
- 活動情報（イベント）がない日は、ツイートがあっても前後2日以内でなければ日付見出しが表示されない
- 活動情報もツイートもない日は表示されないため、月全体の時系列が把握しにくい
- `NEXT_PUBLIC_SURROUNDING_DAYS` 環境変数による調整が必要で複雑

### 月ナビゲーション上限（`MonthPagination.tsx`）

```ts
// 次月ボタンの disabled 判定（未来月には遷移不可）
const isNextDisabled = loading || nextYM > currentYM;  // currentYM = 現在の年月

// 年ドロップダウンの上限 = 現在年
const endYear = parseYearMonth(currentYM).year;
```

**現状の課題:**
- 上限が「現在の年月」のため、2026年10月以降も（将来的に）遷移できてしまう
- ExWHYZ の活動期間は2026年9月30日で終了するため、それ以降の月は表示不要

---

## 2. 変更詳細

### 2.1 `lib/constants.ts`（修正）— アーカイブ終了日定数の追加

**変更前（v3.16）:**
```ts
export const ARCHIVE_START_DATE_CLIENT: string =
  process.env.NEXT_PUBLIC_ARCHIVE_START_DATE ?? '2022-06-01T00:00:00Z';
```

**変更後（v3.17）:**
```ts
export const ARCHIVE_START_DATE_CLIENT: string =
  process.env.NEXT_PUBLIC_ARCHIVE_START_DATE ?? '2022-06-01T00:00:00Z';

/**
 * アーカイブ検索の終了日時（ExWHYZ活動終了日）
 * 環境変数 NEXT_PUBLIC_ARCHIVE_END_DATE で上書き可能（クライアント側）
 */
export const ARCHIVE_END_DATE_CLIENT: string =
  process.env.NEXT_PUBLIC_ARCHIVE_END_DATE ?? '2026-09-30T23:59:59Z';
```

### 2.2 `components/Timeline/TimelineContainer.tsx`（修正）— 全日付表示に変更

**変更前（v3.16）:**
```ts
// 環境変数から前後表示日数を取得（未設定・非数値・負の値の場合はデフォルト2日）
const rawSurroundingDays = parseInt(
  process.env.NEXT_PUBLIC_SURROUNDING_DAYS ?? '2',
  10
);
const surroundingDays = isNaN(rawSurroundingDays) || rawSurroundingDays < 0 ? 2 : rawSurroundingDays;

// ── 選択月のイベント日付を収集（前後 surroundingDays 日を含む）──────────
const allDisplayDates = new Set<string>();

// 選択月に該当するイベント日付を抽出
const monthEvents = timeline.filter((day) => day.date.startsWith(currentYearMonth));

monthEvents.forEach((day) => {
  const eventDate = new Date(day.date);
  for (let i = -surroundingDays; i <= surroundingDays; i++) {
    const targetDate = new Date(eventDate);
    targetDate.setDate(eventDate.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0];
    // 選択月の範囲内のみ追加（前後月にはみ出さない）
    if (dateStr.startsWith(currentYearMonth)) {
      allDisplayDates.add(dateStr);
    }
  }
});

// ツイートがある日付も追加
tweets.forEach((day) => {
  if (day.date.startsWith(currentYearMonth)) {
    allDisplayDates.add(day.date);
  }
});
```

**変更後（v3.17）:**
```ts
// ── 選択月の全日付を生成 ──────────────────────────────────────────────
const allDisplayDates = new Set<string>();

// 選択月の1日〜末日を全て追加
const [ymYear, ymMonth] = currentYearMonth.split('-').map(Number);
const daysInMonth = new Date(ymYear, ymMonth, 0).getDate();
for (let d = 1; d <= daysInMonth; d++) {
  const dateStr = `${currentYearMonth}-${String(d).padStart(2, '0')}`;
  allDisplayDates.add(dateStr);
}
```

> **注意:** ツイートがある日付の追加ループ（`tweets.forEach`）は不要になるため削除します。
> 選択月の全日付が既に `allDisplayDates` に含まれているためです。

### 2.3 `components/Timeline/MonthPagination.tsx`（修正）— 終了月の上限制限を追加

`ARCHIVE_END_DATE_CLIENT` を import し、2026年9月を上限とする制限を追加します。

**変更前（v3.16）:**
```ts
import { ARCHIVE_START_DATE_CLIENT } from '@/lib/constants';

// ...

/** ARCHIVE_START_DATE_CLIENT から "YYYY-MM" を抽出 */
function getArchiveStartYearMonth(): string {
  return ARCHIVE_START_DATE_CLIENT.slice(0, 7);
}

// 次月ボタンの disabled 判定（未来月には遷移不可）
const isNextDisabled = loading || nextYM > currentYM;

// 年ドロップダウンの選択肢（アーカイブ開始年〜現在年）
const years = useMemo(() => {
  const startYear = parseYearMonth(archiveStartYM).year;
  const endYear = parseYearMonth(currentYM).year;
  // ...
}, [archiveStartYM, currentYM]);

// 月ドロップダウンの disabled 判定
const isMonthDisabled = (month: number): boolean => {
  const candidate = toYearMonth(curYear, month);
  return candidate > currentYM || candidate < archiveStartYM;
};

// 年変更時の補正
const handleYearChange = (newYear: number) => {
  const candidate = toYearMonth(newYear, curMonth);
  if (candidate > currentYM) {
    onMonthChange(currentYM);
  } else if (candidate < archiveStartYM) {
    onMonthChange(archiveStartYM);
  } else {
    onMonthChange(candidate);
  }
};

const handleMonthChange = (newMonth: number) => {
  const candidate = toYearMonth(curYear, newMonth);
  if (candidate > currentYM || candidate < archiveStartYM) return;
  onMonthChange(candidate);
};
```

**変更後（v3.17）:**
```ts
import { ARCHIVE_START_DATE_CLIENT, ARCHIVE_END_DATE_CLIENT } from '@/lib/constants';

// ...

/** ARCHIVE_END_DATE_CLIENT から "YYYY-MM" を抽出 */
function getArchiveEndYearMonth(): string {
  return ARCHIVE_END_DATE_CLIENT.slice(0, 7);  // "2026-09"
}

// 次月ボタンの disabled 判定（終了月より後には遷移不可）
const archiveEndYM = getArchiveEndYearMonth();
const isNextDisabled = loading || nextYM > archiveEndYM;

// 年ドロップダウンの選択肢（アーカイブ開始年〜終了年）
const years = useMemo(() => {
  const startYear = parseYearMonth(archiveStartYM).year;
  const endYear = parseYearMonth(archiveEndYM).year;  // 2026
  // ...
}, [archiveStartYM, archiveEndYM]);

// 月ドロップダウンの disabled 判定
const isMonthDisabled = (month: number): boolean => {
  const candidate = toYearMonth(curYear, month);
  return candidate > archiveEndYM || candidate < archiveStartYM;
};

// 年変更時の補正
const handleYearChange = (newYear: number) => {
  const candidate = toYearMonth(newYear, curMonth);
  if (candidate > archiveEndYM) {
    onMonthChange(archiveEndYM);
  } else if (candidate < archiveStartYM) {
    onMonthChange(archiveStartYM);
  } else {
    onMonthChange(candidate);
  }
};

const handleMonthChange = (newMonth: number) => {
  const candidate = toYearMonth(curYear, newMonth);
  if (candidate > archiveEndYM || candidate < archiveStartYM) return;
  onMonthChange(candidate);
};
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/constants.ts` | **修正** | `ARCHIVE_END_DATE_CLIENT` 定数を追加 |
| `components/Timeline/TimelineContainer.tsx` | **修正** | 全日付表示ロジックに変更（surroundingDays 削除） |
| `components/Timeline/MonthPagination.tsx` | **修正** | 終了月（2026-09）の上限制限を追加 |

---

## 4. UI仕様の変更

### 4.1 日付見出し表示

| 状態 | v3.16（変更前） | v3.17（変更後） |
|------|----------------|----------------|
| イベントあり | イベント日 ± 2日 | 選択月の全日付 |
| イベントなし・ツイートあり | ツイートがある日のみ | 選択月の全日付 |
| イベントなし・ツイートなし | 表示なし | 選択月の全日付（イベント・ツイートなし表示） |

### 4.2 月ナビゲーション上限

| 状態 | v3.16（変更前） | v3.17（変更後） |
|------|----------------|----------------|
| 「次月 →」disabled 条件 | 現在月より後 | **2026年9月より後** |
| 年ドロップダウン上限 | 現在年 | **2026年** |
| 月ドロップダウン disabled | 現在月より後 | **2026年9月より後** |

---

## 5. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `NEXT_PUBLIC_SURROUNDING_DAYS` 環境変数 | ⚠️ 廃止 | v3.17以降は使用されない |
| `ARCHIVE_START_DATE_CLIENT` | ✅ 変更なし | 月ナビの最古月制御に引き続き使用 |
| IndexedDBキャッシュ | ✅ 変更なし | データ取得ロジックは変更なし |
| モックモード | ✅ 変更なし | `NEXT_PUBLIC_USE_MOCK=true` 時の挙動は変更なし |

---

## 6. 実装フェーズ案

### フェーズ1: 定数追加
- [ ] `lib/constants.ts` に `ARCHIVE_END_DATE_CLIENT` を追加

### フェーズ2: 日付生成ロジック変更
- [ ] `components/Timeline/TimelineContainer.tsx` の日付生成ロジックを全日付表示に変更

### フェーズ3: 月ナビゲーション上限制限
- [ ] `components/Timeline/MonthPagination.tsx` に終了月の上限制限を追加

---

## 7. 次のステップ

この変更要求書（v3.17）の内容でご承認いただけましたら、フェーズ1から順に実装を進めます。

ご確認・ご意見をお願いいたします！🎉
