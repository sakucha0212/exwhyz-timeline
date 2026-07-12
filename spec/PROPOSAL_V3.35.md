# ExWHYZ-Timeline 初回表示時タイムラインタブ無効化バグ修正 変更要求書（v3.35）

## 📋 変更要件の整理

### v3.35での変更要件

1. **バグ修正**: 初回表示時にタイムラインタブが無効化されており、「タイムライン」タブをクリックできない問題を修正する

---

## 1. 現状（v3.34）と問題の詳細

### 問題

画面を最初に表示したとき、`targetYearMonth` が `null` のため、`ViewModeTabs` のタイムラインタブが `disabled` になり、タイムライン画面に遷移できない。

### 原因

```typescript
// app/page.tsx
const [targetYearMonth, setTargetYearMonth] = useState<string | null>(null);
```

```typescript
// ViewModeTabs.tsx
disabled={!hasTargetMonth}  // hasTargetMonth === targetYearMonth !== null → false
```

---

## 2. 変更詳細

### 2.1 `app/page.tsx`（修正）

`targetYearMonth` の初期値を `null` から `getCurrentYearMonth()` に変更する。

**変更前:**
```typescript
const [targetYearMonth, setTargetYearMonth] = useState<string | null>(null);
```

**変更後:**
```typescript
import { getCurrentYearMonth } from '@/lib/idb-cache';

const [targetYearMonth, setTargetYearMonth] = useState<string>(getCurrentYearMonth());
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.35.md` | **新規** | 本変更要求書 |
| `app/page.tsx` | **修正** | `targetYearMonth` 初期値を `getCurrentYearMonth()` に変更 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| ハイライト画面 | ✅ 変更なし | |
| タイムライン画面 | ✅ 初回表示時から有効 | 当月が表示される |
| その他 | ✅ 変更なし | |