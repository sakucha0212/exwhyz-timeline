# ExWHYZ-Timeline タイムライン機能 変更要求書（v2.4）

## 📋 変更要件の整理

### v2.4での変更要件
- **見出し日付の表示範囲をパラメータ化**: 活動情報の前後何日分の見出し日付を表示するかを、ハードコードではなくパラメータで設定できるようにする

---

## 1. 変更の背景と目的

### 現状の課題

**v2.2で実装された現在の動作**:
- 活動情報が存在する日付を基準に、前後**固定で2日間**の見出し日付を生成している
- この値（`2`）は `TimelineContainer.tsx` 内にハードコードされており、変更するにはソースコードを直接編集する必要がある

**該当箇所（`TimelineContainer.tsx`）**:
```tsx
// 各イベント日付の前後2日間の日付を生成
const allDisplayDates = new Set<string>();

timeline.forEach((day) => {
  const eventDate = new Date(day.date);

  // 前後2日間（合計5日間）の日付を追加
  for (let i = -2; i <= 2; i++) {   // ← ここがハードコード
    const targetDate = new Date(eventDate);
    targetDate.setDate(eventDate.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0];
    allDisplayDates.add(dateStr);
  }
});
```

### 変更の目的

- **柔軟性の向上**: 前後の表示日数をユーザーが任意に設定できるようにする
- **ユースケースへの対応**: 表示したい期間の前後幅はサイト運営方針によって異なるため、外部から設定可能にする
- **保守性の向上**: ソースコードを変更せずに動作を調整できる

---

## 2. 設定値と動作仕様

### パラメータ名

```
NEXT_PUBLIC_SURROUNDING_DAYS
```

### 設定値の定義

| 設定値 | 表示される見出し日付の範囲 | 合計表示日数 | 動作説明 |
|--------|--------------------------|------------|----------|
| `0`    | 活動日のみ               | 1日        | 当日のみ表示 |
| `1`    | 活動日の前後1日          | 3日        | 前日・当日・翌日を表示 |
| `2`    | 活動日の前後2日          | 5日        | 2日前〜2日後を表示（現在の動作） |

### デフォルト値

設定値が未指定の場合は `2`（現在の動作）をデフォルトとして使用する。

---

## 3. 設定値ごとの表示例

### 例: 2024年5月20日にライブがあった場合

#### パターンA: `NEXT_PUBLIC_SURROUNDING_DAYS=2`（前後2日）

```
📅 2024年5月18日（土）  ← 活動日の2日前
    活動情報: なし
    Tweet: 「明後日ライブ！楽しみ！」

📅 2024年5月19日（日）  ← 活動日の1日前
    活動情報: なし
    Tweet: 「明日だ！ドキドキ！」

📅 2024年5月20日（月）  ← 活動日
    活動情報: 🎤 ライブ「ExWHYZ 1st LIVE」開催
    Tweet: 「最高だった！！！」

📅 2024年5月21日（火）  ← 活動日の1日後
    活動情報: なし
    Tweet: 「余韻がやばい...」

📅 2024年5月22日（水）  ← 活動日の2日後
    活動情報: なし
    Tweet: 「まだ興奮が冷めない」
```

#### パターンB: `NEXT_PUBLIC_SURROUNDING_DAYS=1`（前後1日）

```
📅 2024年5月19日（日）  ← 活動日の1日前
    活動情報: なし
    Tweet: 「明日だ！ドキドキ！」

📅 2024年5月20日（月）  ← 活動日
    活動情報: 🎤 ライブ「ExWHYZ 1st LIVE」開催
    Tweet: 「最高だった！！！」

📅 2024年5月21日（火）  ← 活動日の1日後
    活動情報: なし
    Tweet: 「余韻がやばい...」
```

#### パターンC: `NEXT_PUBLIC_SURROUNDING_DAYS=0`（当日のみ）

```
📅 2024年5月20日（月）  ← 活動日のみ
    活動情報: 🎤 ライブ「ExWHYZ 1st LIVE」開催
    Tweet: 「最高だった！！！」
```

---

## 4. 変更対象ファイルと変更内容

### 変更対象ファイル

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `exwhyz-timeline/.env.local` | 追加 | `NEXT_PUBLIC_SURROUNDING_DAYS` 環境変数の追加 |
| `exwhyz-timeline/components/Timeline/TimelineContainer.tsx` | 修正 | ハードコードされた `2` を環境変数から読み取るよう変更 |
| `exwhyz-timeline/README.md` | 修正 | 新しい設定パラメータの説明を追加 |

### `TimelineContainer.tsx` の変更方針

#### 変更前
```tsx
// 各イベント日付の前後2日間の日付を生成
const allDisplayDates = new Set<string>();

timeline.forEach((day) => {
  const eventDate = new Date(day.date);

  // 前後2日間（合計5日間）の日付を追加
  for (let i = -2; i <= 2; i++) {
    const targetDate = new Date(eventDate);
    targetDate.setDate(eventDate.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0];
    allDisplayDates.add(dateStr);
  }
});
```

#### 変更後
```tsx
// 環境変数から前後表示日数を取得（未設定時は2日）
const surroundingDays = parseInt(
  process.env.NEXT_PUBLIC_SURROUNDING_DAYS ?? '2',
  10
);

// 各イベント日付の前後n日間の日付を生成
const allDisplayDates = new Set<string>();

timeline.forEach((day) => {
  const eventDate = new Date(day.date);

  // 前後surroundingDays日間（合計 surroundingDays * 2 + 1 日間）の日付を追加
  for (let i = -surroundingDays; i <= surroundingDays; i++) {
    const targetDate = new Date(eventDate);
    targetDate.setDate(eventDate.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0];
    allDisplayDates.add(dateStr);
  }
});
```

### `.env.local` の変更方針

#### 追加する設定
```bash
# 活動情報の前後何日分の見出し日付を表示するか（デフォルト: 2）
# 0: 当日のみ / 1: 前後1日 / 2: 前後2日
NEXT_PUBLIC_SURROUNDING_DAYS=2
```

---

## 5. バリデーション仕様

### 想定する入力値の制約

| 条件 | 動作 |
|------|------|
| 未設定（空文字・未定義） | デフォルト値 `2` を使用 |
| 数値として解析できない文字列 | デフォルト値 `2` を使用（NaN対策） |
| 負の値（例: `-1`） | 動作未定義のため、デフォルト値 `2` にフォールバック |
| `0` | 活動日のみを表示 |
| `1` | 前後1日を表示 |
| `2` | 前後2日を表示（現在の動作と同一） |
| `3` 以上 | それに相当する日数を表示（上限なし） |

### バリデーションの実装方針

```tsx
const rawValue = parseInt(process.env.NEXT_PUBLIC_SURROUNDING_DAYS ?? '2', 10);
const surroundingDays = isNaN(rawValue) || rawValue < 0 ? 2 : rawValue;
```

---

## 6. 後方互換性

- `NEXT_PUBLIC_SURROUNDING_DAYS` を設定しない場合、デフォルト値 `2` が使用される
- **既存の動作は完全に維持される**（v2.2と同一の表示結果）

---

## 7. 実装フェーズ案

### フェーズ1: パラメータ化の実装（今回）
- [x] `.env.local` に `NEXT_PUBLIC_SURROUNDING_DAYS=2` を追加
- [x] `TimelineContainer.tsx` の日付生成ロジックをパラメータ化
- [x] バリデーション処理の実装
- [ ] 動作確認（設定値 `0` / `1` / `2` でそれぞれ確認）
- [x] ドキュメント更新（`README.md`）

### フェーズ2: インタラクション追加（継続）
- [ ] カテゴリフィルター機能
- [ ] 日付範囲検索
- [ ] 日付ジャンプ機能

### フェーズ3: X API連携（継続）
- [ ] データソース切り替えロジックの実装
- [ ] X API認証フロー（OAuth 2.0）
- [ ] 日付範囲でのポスト検索

---

## 8. 変更による利点

### ✅ 運用の柔軟性向上
- コードを変更せずに表示範囲を調整可能
- サイト運営方針に合わせた設定が可能

### ✅ ユーザー体験の最適化
- 活動が密集している時期は `0` や `1` に設定してページが長くなりすぎるのを防ぐ
- 活動が少ない時期は `2` 以上に設定してTweetを関連付けやすくする

### ✅ 後方互換性の維持
- デフォルト値 `2` により、設定なしで既存の動作を維持

### ✅ 実装コストの低さ
- 変更箇所は `TimelineContainer.tsx` の数行のみ
- リスクが非常に低い変更

---

## 9. 次のステップ

この変更要求書（v2.4）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`.env.local` の更新** - `NEXT_PUBLIC_SURROUNDING_DAYS=2` を追加
2. **`TimelineContainer.tsx` の改修** - ハードコードをパラメータ化
3. **動作確認** - 設定値 `0` / `1` / `2` での表示確認
4. **ドキュメント更新** - `README.md` に設定パラメータの説明を追加

ご確認・ご意見をお願いいたします！🎉
