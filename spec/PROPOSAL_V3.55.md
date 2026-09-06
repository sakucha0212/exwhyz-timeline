# ExWHYZ-Timeline スマホの戻る/進む対応（画面遷移の履歴化）変更要求書（v3.55）

## 📋 変更要件の整理

1. **画面状態の URL 化**: ハイライト/タイムラインのモードと選択中の月を URL のクエリパラメータ（`?view=…&month=…`）に反映し、URL を唯一の真実源（Single Source of Truth）とする
2. **履歴エントリの追加**: 画面遷移（ハイライト⇄タイムライン、月移動）を `router.push()` で行い、ブラウザ履歴を積むことで「戻る/進む」を可能にする
3. **外部リンクからの復帰**: 公式情報リンクを開いて戻った際も、URL から表示状態（タイムライン＋選択月）を復元できるようにする

---

## 1. 現状（v3.54）と問題の詳細

画面モードと選択月は React の `useState` だけで管理されており、**URL とブラウザ履歴に一切反映されていない**。

| レイヤ | ファイル | 該当箇所 | 現状の挙動 |
|--------|---------|---------|-----------|
| 画面状態 | `app/page.tsx` | L24-38 | `viewMode` / `targetYearMonth` を `useState` で管理（URL 反映なし） |
| タブ切替 | `components/ViewModeTabs.tsx` | `onClick={() => onModeChange(...)}` | state 変更のみ |
| カード選択 | `components/Highlights/HighlightCard.tsx` | `onClick={() => onSelectMonth(targetYM)}` | state 変更のみ |
| 月移動 | `components/Timeline/TimelineContainer.tsx` | L65-67 / L213 / L238 | `currentYearMonth` を内部 state で管理 |
| 外部リンク | `components/Timeline/EventColumn.tsx` | L62-74 | `officialSource.url` を `target="_blank"` で開く |

### 問題（2つのシナリオ）

**シナリオA: ハイライト→タイムライン後の「戻る」でアプリが閉じる**

1. X（アプリ内ブラウザ等）からアプリを開く → 履歴は `/`（ハイライト）の1件だけ
2. ハイライトでイベントを選択 → `setViewMode('timeline')` の state 変更のみ（履歴は増えない）
3. 「戻る」を押す → アプリ内に戻る先が無いため**アプリ自体が閉じる**（X に戻る）

**シナリオB: 公式情報リンクを開いて戻ると状態が失われる/閉じる**

1. タイムライン表示中に「公式情報を見る」をタップ → 外部サイトへ遷移
2. 戻る／復帰すると、選択月などの表示状態が URL に残っていないため、初期状態（ハイライト）に戻る、または WebView ごと閉じて再起動を強いられる

> どちらも「画面状態が URL/履歴にない」という同一の根本原因に起因する。

---

## 2. 変更詳細

### 2.1 設計方針: URL を唯一の真実源に

URL スキームを以下の通り定め、すべての画面遷移を `router.push()`（履歴エントリ追加）で行う。

| URL | 意味 |
|-----|------|
| `/` または `/?view=highlight` | ハイライト画面（`view` 省略時は highlight） |
| `/?view=timeline&month=YYYY-MM` | タイムライン画面（`month` は選択月） |
| `/?view=highlight&month=YYYY-MM` | ハイライト画面（選択月を保持したまま戻る） |

- `view` は `highlight` / `timeline`、`month` は `YYYY-MM` 形式
- `month` はタイムラインの選択月。ハイライトに戻る際も維持する（現行の「targetYearMonth を維持」挙動を踏襲）
- 戻る/進むはブラウザ標準の popstate を Next.js App Router が処理し、`useSearchParams` が更新を検知して再描画する（追加の popstate リスナー実装は不要）

### 2.2 `app/page.tsx`

**変更1: `useSearchParams` 対応と Suspense ラッパーの追加**

`useSearchParams` は prerender 時に最も近い `<Suspense>` 境界まで CSR 化されるため、既存の `Home` を内側に移動し、外側を `<Suspense>` で包む。

```tsx
// 変更前（抜粋）
export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('highlight');
  const [targetYearMonth, setTargetYearMonth] = useState<string>(getCurrentYearMonth());
  // ...
}

// 変更後（抜粋）
function LoadingScreen() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">読み込み中...</div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Home />
    </Suspense>
  );
}

function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  // URL を唯一の真実源として読み取り
  const viewMode: ViewMode =
    searchParams.get('view') === 'timeline' ? 'timeline' : 'highlight';
  const targetYearMonth = searchParams.get('month');

  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  // ...
}
```

**変更2: 遷移ハンドラを `router.push()` に置き換え**

```tsx
// 変更後（追加）
const buildUrl = useCallback((view: ViewMode, month?: string | null) => {
  const params = new URLSearchParams();
  params.set('view', view);
  if (month) params.set('month', month);
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}, []);

// ハイライトで月選択 → タイムラインへ
const handleSelectMonth = useCallback((yearMonth: string) => {
  router.push(buildUrl('timeline', yearMonth));
}, [router, buildUrl]);

// タイムラインで月移動（前月/次月/年月ピッカー）
const handleMonthChange = useCallback((yearMonth: string) => {
  router.push(buildUrl('timeline', yearMonth));
}, [router, buildUrl]);

// ハイライトへ戻る（選択月は維持）
const handleBackToHighlight = useCallback(() => {
  router.push(buildUrl('highlight', targetYearMonth));
}, [router, buildUrl, targetYearMonth]);

// タブ切替
const handleModeChange = useCallback((mode: ViewMode) => {
  if (mode === 'highlight') {
    router.push(buildUrl('highlight', targetYearMonth));
  } else if (targetYearMonth) {
    router.push(buildUrl('timeline', targetYearMonth));
  }
}, [router, buildUrl, targetYearMonth]);
```

**変更3: 描画部の `key` 削除と `onMonthChange` の受け渡し**

```tsx
// 変更前
<TimelineContainer
  key={targetYearMonth ?? 'default'}
  timeline={timelineData.timeline}
  categories={timelineData.categories}
  targetYearMonth={targetYearMonth ?? undefined}
  onBackToHighlight={() => setViewMode('highlight')}
/>

// 変更後（key を削除し、制御化した月状態を onMonthChange で通知）
<TimelineContainer
  timeline={timelineData.timeline}
  categories={timelineData.categories}
  targetYearMonth={targetYearMonth ?? undefined}
  onMonthChange={handleMonthChange}
  onBackToHighlight={handleBackToHighlight}
/>
```

> 補足: 不要になった `getCurrentYearMonth` の import を削除（月のフォールバックは `TimelineContainer` 側が担当）。

### 2.3 `components/Timeline/TimelineContainer.tsx`

**変更1: 月状態を「内部 state」から「制御（controlled）」へ**

```tsx
// 変更前
const [currentYearMonth, setCurrentYearMonth] = useState<string>(
  targetYearMonth ?? getCurrentYearMonth()
);

// 変更後
const currentYearMonth = targetYearMonth ?? getCurrentYearMonth();
const handleMonthChange = (ym: string) => onMonthChange(ym);
```

**変更2: `onMonthChange` prop を必須化（interface）**

```tsx
// 変更前
interface TimelineContainerProps {
  timeline: DayData[];
  categories: Category[];
  targetYearMonth?: string;
  onMonthChange?: (yearMonth: string) => void;
  onBackToHighlight?: () => void;
}

// 変更後
interface TimelineContainerProps {
  timeline: DayData[];
  categories: Category[];
  targetYearMonth?: string;
  /** 月変更時のコールバック（URL 同期のため必須） */
  onMonthChange: (yearMonth: string) => void;
  onBackToHighlight?: () => void;
}
```

**変更3: 月移動の全参照を `handleMonthChange` に置換（4箇所）**

```tsx
// 変更前（エラー分岐 / メイン分岐の2箇所）
<MonthPagination ... onMonthChange={setCurrentYearMonth} ... />

// 変更後
<MonthPagination ... onMonthChange={handleMonthChange} ... />

// 変更前（下部ナビの前月/次月ボタン）
onClick={() => setCurrentYearMonth(prevYM)}
onClick={() => setCurrentYearMonth(nextYM)}

// 変更後
onClick={() => handleMonthChange(prevYM)}
onClick={() => handleMonthChange(nextYM)}
```

> `useMonthlyTwitterData(currentYearMonth)` は `yearMonth` 変更を `useEffect` で検知して再取得するため、`key` による再マウントは不要。制御化により `hideEmptyDays` などの UI 状態も月移動をまたいで保持される（副次的な改善）。

### 2.4 変更不要のファイル（確認のみ）

| ファイル | 扱い | 理由 |
|---------|------|------|
| `components/Highlights/HighlightsContainer.tsx` | 変更なし | `onSelectMonth` コールバックをそのまま利用 |
| `components/ViewModeTabs.tsx` | 変更なし | `onModeChange` コールバックをそのまま利用 |
| `components/Timeline/EventColumn.tsx` | 変更なし | 外部リンクは `target="_blank"` のまま。URL 化により戻り時の状態復元が可能になるため |

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.55.md` | **新規** | 本変更要求書 |
| `app/page.tsx` | **修正** | Suspense ラッパー追加、`useSearchParams` で URL 読み取り、遷移を `router.push` 化、`key`/不要 import 削除 |
| `components/Timeline/TimelineContainer.tsx` | **修正** | 月状態を制御化、`onMonthChange` 必須化、月移動をコールバック経由に変更 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| ハイライト表示 | ✅ 変更なし | 見た目・操作は従来どおり |
| タイムライン表示 | ✅ 変更なし | 表示ロジックは不変 |
| 戻る/進む | ✅ 改善 | 履歴エントリが積まれ、アプリ内で戻る/進むが機能 |
| 外部リンク復帰 | ✅ 改善 | URL から選択月を復元（WebView 再生成時も有効） |
| 直接リンク共有 | ✅ 改善 | `?view=timeline&month=YYYY-MM` の URL で直接その月を開ける |
| 月移動時の `hideEmptyDays` | ✅ 改善 | 制御化により月をまたいで状態が保持される |
| API 呼出 | ✅ 変更なし | 月移動時の取得方式は従来どおり（IndexedDB キャッシュ優先） |

### 留意点

- **初回ロード直後の「戻る」**: リンクから開いた直後（履歴1件のみ）に「戻る」を押すと、従来どおりアプリが閉じる。これはブラウザ標準の挙動であり、**アプリ内遷移後は**閉じずに戻れるようになるのが本変更のスコープ。
- **未ログイン時の deep link**: `/?view=timeline&month=…` を未認証で開くと現在は `router.push('/login')` され、ログイン後は `callbackUrl: '/'` 固定のため選択月は失われる。必要なら後続で callbackUrl に元 URL を保持する対応を検討（本変更では対象外）。
- **`target="_blank"` のモバイル挙動**: アプリ内ブラウザによっては新規タブが使えず同一 WebView で遷移する場合があるが、URL 化によりどのケースでも戻り時にタイムライン＋選択月が復元される。

---

## 5. 実装フェーズ案

### フェーズ1: 画面状態の URL 化
- [ ] `app/page.tsx` に Suspense ラッパーを追加し、`useSearchParams` で `view` / `month` を読み取り
- [ ] 遷移ハンドラ（`handleSelectMonth` / `handleModeChange` / `handleBackToHighlight` / `handleMonthChange`）を `router.push` に変更

### フェーズ2: タイムラインの月状態制御化
- [ ] `components/Timeline/TimelineContainer.tsx` の `currentYearMonth` を制御化し、月移動を `onMonthChange` 経由に変更

### フェーズ3: 動作確認
- [ ] TypeScript コンパイル確認（`npm run build` / `tsc`）
- [ ] ハイライト→イベント選択→タイムライン→「戻る」でハイライトに戻れること（アプリが閉じないこと）
- [ ] 「進む」でタイムラインに戻れること
- [ ] 公式情報リンクを開いて戻った際に、タイムライン＋選択月が復元されること
- [ ] 前月/次月/年月ピッカーの移動が「戻る/進む」で追えること
- [ ] スマホ（アプリ内ブラウザ含む）での目視確認

---

## 6. 次のステップ

この変更要求書（v3.55）の内容でご承認いただけましたら、フェーズ1から順に実装を進めます。

ご確認・ご意見をお願いいたします！🎉
