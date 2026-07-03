# ExWHYZ-Timeline 空日非表示オプション 変更要求書（v3.8）

## 📋 変更要件の整理

### v3.8での変更要件

- **活動情報もツイートも存在しない日の日付見出しを非表示にするオプションを追加する**:  
  現状、イベント日付の前後 n 日間を表示する仕様のため、活動情報もツイートも存在しない日（空日）の日付見出しが表示されており見づらい。  
  オプションを有効にすることで空日を非表示にできるようにする。  
  このオプションはデフォルトで有効状態とする。

---

## 1. 変更の背景と目的

### 現状の課題

| 課題 | 詳細 |
|------|------|
| 空日の日付見出しが表示される | イベント日付の前後 n 日間を表示する仕様のため、活動情報もツイートも存在しない日（空日）も `DayEntry` としてレンダリングされる |
| 見づらい | 空日の日付見出しが多数表示されることで、実際に情報のある日が埋もれてしまう |

### 変更の目的

- **空日を非表示にするオプションを追加する**: デフォルトで有効にすることで、初期表示から見やすい状態にする
- **ユーザーが任意に切り替えられる**: チェックボックスで ON/OFF を切り替えられるようにする
- **既存の表示ロジックに最小限の変更で対応する**: `TimelineContainer` 内のフィルタリングと、ナビゲーションバーへのトグル追加のみで実現する

---

## 2. UI設計

### 2.1 ナビゲーションバーへのトグル追加

```
┌─────────────────────────────────────────────────────────────────────┐
│  📅 ジャンプ:  [2026年 ▼]  [8月 ▼]    ☑ 空日を非表示              │  ← sticky 固定
└─────────────────────────────────────────────────────────────────────┘
```

- 既存の年月ジャンプナビゲーションバー（`YearMonthNav`）の右側にチェックボックスを追加する
- ラベル: `空日を非表示`
- デフォルト: **チェック済み（有効）**

### 2.2 空日の定義

以下の条件を**両方**満たす日を「空日」とする：

- `events`（活動情報）が 0 件
- `tweets`（ツイート）が 0 件

### 2.3 オプション ON/OFF の挙動

| 状態 | 挙動 |
|------|------|
| ON（デフォルト） | 空日の `DayEntry` を非表示にする |
| OFF | 空日を含む全日付の `DayEntry` を表示する（現状と同じ） |

---

## 3. 変更対象ファイルと変更内容

### 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `components/Timeline/YearMonthNav.tsx` | **修正** | `hideEmptyDays` state と切り替えチェックボックスを追加。`onHideEmptyDaysChange` コールバックを props で受け取る |
| `components/Timeline/TimelineContainer.tsx` | **修正** | `hideEmptyDays` state を管理し、`YearMonthNav` に渡す。`sortedDates` のフィルタリングロジックを追加 |

---

## 4. 変更詳細

### 4.1 `components/Timeline/YearMonthNav.tsx` の変更

#### 変更前（v3.7）

```typescript
interface YearMonthNavProps {
  /** タイムラインに存在する全日付（YYYY-MM-DD 形式、ソート済み） */
  dates: string[];
}

export default function YearMonthNav({ dates }: YearMonthNavProps) {
  // ...
  return (
    <div className="sticky top-0 z-50 bg-black border-b border-gray-700 py-3 px-4">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <span className="text-gray-400 text-sm whitespace-nowrap">📅 ジャンプ:</span>
        {/* 年ドロップダウン */}
        ...
        {/* 月ドロップダウン */}
        ...
      </div>
    </div>
  );
}
```

#### 変更後（v3.8）

```typescript
interface YearMonthNavProps {
  /** タイムラインに存在する全日付（YYYY-MM-DD 形式、ソート済み） */
  dates: string[];
  /** 空日を非表示にするかどうか */
  hideEmptyDays: boolean;
  /** 空日非表示オプションの変更コールバック */
  onHideEmptyDaysChange: (value: boolean) => void;
}

export default function YearMonthNav({ dates, hideEmptyDays, onHideEmptyDaysChange }: YearMonthNavProps) {
  // ...（既存のロジックはそのまま）
  return (
    <div className="sticky top-0 z-50 bg-black border-b border-gray-700 py-3 px-4">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <span className="text-gray-400 text-sm whitespace-nowrap">📅 ジャンプ:</span>
        {/* 年ドロップダウン */}
        ...
        {/* 月ドロップダウン */}
        ...

        {/* 空日非表示トグル */}
        <label className="flex items-center gap-2 ml-auto cursor-pointer text-sm text-gray-400 whitespace-nowrap">
          <input
            type="checkbox"
            checked={hideEmptyDays}
            onChange={(e) => onHideEmptyDaysChange(e.target.checked)}
            className="w-4 h-4 accent-blue-500 cursor-pointer"
          />
          空日を非表示
        </label>
      </div>
    </div>
  );
}
```

**変更点のまとめ:**
- `YearMonthNavProps` に `hideEmptyDays: boolean` と `onHideEmptyDaysChange: (value: boolean) => void` を追加
- ナビゲーションバーの右端にチェックボックスとラベルを追加
- チェックボックスの `checked` は `hideEmptyDays` prop にバインド
- `onChange` で `onHideEmptyDaysChange` コールバックを呼び出す

---

### 4.2 `components/Timeline/TimelineContainer.tsx` の変更

#### 変更前（v3.7）

```typescript
export default function TimelineContainer({ timeline, categories, userTweets }: TimelineContainerProps) {
  // ...（既存のロジック）

  // 日付を配列に変換してソート（古い順）
  const sortedDates = Array.from(allDisplayDates).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  );

  // ...

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
}
```

#### 変更後（v3.8）

```typescript
export default function TimelineContainer({ timeline, categories, userTweets }: TimelineContainerProps) {
  // 空日非表示オプション（デフォルト: true）
  const [hideEmptyDays, setHideEmptyDays] = useState<boolean>(true);

  // ...（既存のロジック）

  // 日付を配列に変換してソート（古い順）
  const sortedDates = Array.from(allDisplayDates).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  );

  // 表示対象の日付（空日非表示オプションに応じてフィルタリング）
  const displayDates = hideEmptyDays
    ? sortedDates.filter(date =>
        getEventsForDate(date).length > 0 || getTweetsForDate(date).length > 0
      )
    : sortedDates;

  return (
    <>
      {/* 年月ジャンプナビゲーション */}
      <YearMonthNav
        dates={displayDates}
        hideEmptyDays={hideEmptyDays}
        onHideEmptyDaysChange={setHideEmptyDays}
      />

      {/* タイムライン本体 */}
      <div className="space-y-8 mt-4">
        {displayDates.map((date) => (
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
}
```

**変更点のまとめ:**
- `useState<boolean>(true)` で `hideEmptyDays` state を追加（デフォルト `true`）
- `displayDates` を導出: `hideEmptyDays` が `true` の場合、`events` と `tweets` が両方 0 件の日付を除外
- `YearMonthNav` に `hideEmptyDays` と `onHideEmptyDaysChange={setHideEmptyDays}` を渡す
- `sortedDates` の代わりに `displayDates` を `YearMonthNav` と `DayEntry` のレンダリングに使用
  - `YearMonthNav` にも `displayDates` を渡すことで、ジャンプ先の候補も空日を除いた日付のみになる

---

## 5. 処理の流れ（v3.8）

```
1. TimelineContainer がレンダリング
   ├─ hideEmptyDays = true（デフォルト）
   ├─ sortedDates（全表示日付の配列）を生成
   ├─ displayDates = sortedDates から空日を除外した配列
   ├─ YearMonthNav に displayDates・hideEmptyDays・onHideEmptyDaysChange を渡す
   └─ displayDates の各日付に対して DayEntry をレンダリング

2. ユーザーが「空日を非表示」チェックボックスを OFF にする
   ├─ onHideEmptyDaysChange(false) が呼ばれる
   ├─ hideEmptyDays = false に更新
   ├─ displayDates = sortedDates（全日付）に変わる
   └─ 空日を含む全 DayEntry が表示される

3. ユーザーが「空日を非表示」チェックボックスを ON にする
   ├─ onHideEmptyDaysChange(true) が呼ばれる
   ├─ hideEmptyDays = true に更新
   ├─ displayDates = 空日を除外した日付配列に戻る
   └─ 空日の DayEntry が非表示になる
```

---

## 6. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `TimelineContainer` の props | ✅ 維持 | `timeline`, `categories`, `userTweets` は変更なし |
| `DayEntry` の props | ✅ 変更なし | `id`, `date`, `events`, `tweets`, `categories` は変更なし |
| `YearMonthNav` の props | ⚠️ 追加あり | `hideEmptyDays` と `onHideEmptyDaysChange` が必須 props として追加される（`TimelineContainer` からのみ呼び出されるため影響範囲は限定的） |
| タイムラインの表示内容・順序 | ✅ 維持 | フィルタリングのみで表示ロジック自体は変更なし |
| X API連携・キャッシュ機構 | ✅ 変更なし | フロントエンドのみの変更 |
| `app/page.tsx` | ✅ 変更なし | `TimelineContainer` の呼び出し方は変更なし |

---

## 7. 実装フェーズ案

### フェーズ1: `components/Timeline/TimelineContainer.tsx` の修正
- [ ] `useState` をインポートに追加
- [ ] `hideEmptyDays` state を追加（デフォルト `true`）
- [ ] `displayDates` の導出ロジックを追加（空日フィルタリング）
- [ ] `YearMonthNav` に `hideEmptyDays` と `onHideEmptyDaysChange` を渡す
- [ ] `sortedDates` → `displayDates` に置き換え（`YearMonthNav` と `DayEntry` のレンダリング部分）

### フェーズ2: `components/Timeline/YearMonthNav.tsx` の修正
- [ ] `YearMonthNavProps` に `hideEmptyDays: boolean` と `onHideEmptyDaysChange: (value: boolean) => void` を追加
- [ ] 関数引数に `hideEmptyDays`, `onHideEmptyDaysChange` を追加
- [ ] ナビゲーションバーにチェックボックスとラベルを追加

### フェーズ3: 動作確認
- [ ] 初期表示で空日が非表示になっているか確認
- [ ] チェックボックスを OFF にすると空日が表示されるか確認
- [ ] チェックボックスを ON に戻すと空日が再び非表示になるか確認
- [ ] 年月ジャンプナビゲーションが `displayDates` に基づいて正しく動作するか確認
- [ ] モバイル表示での動作確認

---

## 8. 次のステップ

この変更要求書（v3.8）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`components/Timeline/TimelineContainer.tsx` の修正** — `hideEmptyDays` state の追加と `displayDates` フィルタリング
2. **`components/Timeline/YearMonthNav.tsx` の修正** — props 追加とチェックボックス UI の追加
3. **動作確認** — 空日の表示/非表示切り替えの動作確認

ご確認・ご意見をお願いいたします！🎉
