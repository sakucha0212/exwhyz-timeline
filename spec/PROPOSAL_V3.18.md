# ExWHYZ-Timeline 空日付の非表示トグル追加 変更要求書（v3.18）

## 📋 変更要件の整理

### v3.18での変更要件

1. **空日付の非表示トグル**: 活動情報もツイートもない日を非表示にするチェックボックスを追加する
2. **デフォルトON**: 初期状態では空日付を非表示にし、スクロール量を削減する

---

## 1. 現状の仕組み（v3.17）

### 日付表示ロジック（`TimelineContainer.tsx`）

```ts
// 選択月の1日〜末日を全て生成
const allDisplayDates = new Set<string>();
const [ymYear, ymMonth] = currentYearMonth.split('-').map(Number);
const daysInMonth = new Date(ymYear, ymMonth, 0).getDate();
for (let d = 1; d <= daysInMonth; d++) {
  const dateStr = `${currentYearMonth}-${String(d).padStart(2, '0')}`;
  allDisplayDates.add(dateStr);
}

// 全日付を表示（活動情報・ツイートがない日も含む）
sortedDates.map((date) => (
  <DayEntry ... />
))
```

**現状の課題:**
- 選択月の全日付（最大31日）を表示するため、活動情報もツイートもない日が多い月はスクロール量が増大する
- 特にツイートデータが未取得の状態では、ほぼ全日付が空になりスクロールが非常に長くなる

---

## 2. 変更詳細

### 2.1 `components/Timeline/MonthPagination.tsx`（修正）— トグルチェックUIの追加

`MonthPaginationProps` に以下を追加します。

**追加 props:**
```ts
/** 空日付（活動情報・ツイートなし）を非表示にするフラグ */
hideEmptyDays?: boolean;
/** 空日付非表示トグルのコールバック */
onToggleHideEmptyDays?: () => void;
```

**UI仕様:**
```
┌──────────────────────────────────────────────────────────────────────┐
│  ← 前月   [2026年 ▼] [7月 ▼]   次月 →   [☑ 空の日を非表示]   [🔄 更新] │
└──────────────────────────────────────────────────────────────────────┘
```

チェックボックスはナビゲーションバー内、次月ボタンの右側に配置します。
ローディング中は `disabled` にします。

### 2.2 `components/Timeline/TimelineContainer.tsx`（修正）— フィルタリングロジックの追加

**追加する状態:**
```ts
// 空日付を非表示にするフラグ（デフォルト: true）
const [hideEmptyDays, setHideEmptyDays] = useState<boolean>(true);
```

**フィルタリングロジック:**
```ts
// hideEmptyDays が true の場合、イベントもツイートもない日を除外
const filteredDates = hideEmptyDays
  ? sortedDates.filter((date) =>
      getEventsForDate(date).length > 0 || getTweetsForDate(date).length > 0
    )
  : sortedDates;
```

**`MonthPagination` への props 追加:**
```tsx
<MonthPagination
  currentYearMonth={currentYearMonth}
  onMonthChange={setCurrentYearMonth}
  loading={loading}
  isCurrentMonth={isCurrent}
  onRefresh={isCurrent ? refresh : undefined}
  lastFetchedAt={lastFetchedAt}
  rateLimitError={rateLimitError}
  hideEmptyDays={hideEmptyDays}
  onToggleHideEmptyDays={() => setHideEmptyDays((prev) => !prev)}
/>
```

**レンダリング部分の変更:**
```tsx
// sortedDates → filteredDates に変更
filteredDates.map((date) => (
  <DayEntry ... />
))

// データなし判定も filteredDates を使用
filteredDates.length === 0 ? (
  <div>この月のデータはありません</div>
) : (...)
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `components/Timeline/MonthPagination.tsx` | **修正** | `hideEmptyDays` / `onToggleHideEmptyDays` props追加、チェックボックスUI追加 |
| `components/Timeline/TimelineContainer.tsx` | **修正** | `hideEmptyDays` 状態管理、フィルタリングロジック追加 |

---

## 4. UI仕様の変更

### 4.1 空日付トグルの挙動

| 状態 | 挙動 |
|------|------|
| チェックON（デフォルト） | 活動情報もツイートもない日は非表示 |
| チェックOFF | 選択月の全日付を表示（v3.17の挙動） |
| ローディング中 | チェックボックスは `disabled` |

### 4.2 「この月のデータはありません」の表示条件

| 状態 | 表示条件 |
|------|---------|
| チェックON | 選択月にイベントもツイートも1件もない場合 |
| チェックOFF | （全日付を表示するため、このメッセージは表示されない） |

---

## 5. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| v3.17の全日付表示 | ✅ 維持 | チェックOFFで同じ挙動 |
| IndexedDBキャッシュ | ✅ 変更なし | データ取得ロジックは変更なし |
| モックモード | ✅ 変更なし | `NEXT_PUBLIC_USE_MOCK=true` 時の挙動は変更なし |

---

## 6. 実装フェーズ案

### フェーズ1: 変更提案書作成
- [x] `spec/PROPOSAL_V3.18.md` を作成

### フェーズ2: コンポーネント修正
- [ ] `components/Timeline/TimelineContainer.tsx` にフィルタリングロジックを追加
- [ ] `components/Timeline/MonthPagination.tsx` にトグルチェックUIを追加

---

## 7. 次のステップ

この変更要求書（v3.18）の内容でご承認いただけましたら、フェーズ2の実装を進めます。

ご確認・ご意見をお願いいたします！🎉
