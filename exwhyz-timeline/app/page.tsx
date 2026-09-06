'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import TimelineContainer from '@/components/Timeline/TimelineContainer';
import ViewModeTabs, { type ViewMode } from '@/components/ViewModeTabs';
import HighlightsContainer from '@/components/Highlights/HighlightsContainer';
import timelineData from '@/data/timeline.json';

function formatTargetLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${year}年${month}月`;
}

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

  // ── URL を唯一の真実源として読み取り ────────────────────────────────
  const viewMode: ViewMode =
    searchParams.get('view') === 'timeline' ? 'timeline' : 'highlight';
  const targetYearMonth = searchParams.get('month');

  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // ── ナビゲーション（履歴エントリを追加） ─────────────────────────────
  const buildUrl = useCallback((view: ViewMode, month?: string | null) => {
    const params = new URLSearchParams();
    params.set('view', view);
    if (month) params.set('month', month);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  }, []);

  // ハイライトで月選択 → タイムラインへ
  const handleSelectMonth = useCallback(
    (yearMonth: string) => {
      router.push(buildUrl('timeline', yearMonth));
    },
    [router, buildUrl]
  );

  // タイムラインで月移動（前月/次月/年月ピッカー）
  const handleMonthChange = useCallback(
    (yearMonth: string) => {
      router.push(buildUrl('timeline', yearMonth));
    },
    [router, buildUrl]
  );

  // ハイライトへ戻る（選択月は維持）
  const handleBackToHighlight = useCallback(() => {
    router.push(buildUrl('highlight', targetYearMonth));
  }, [router, buildUrl, targetYearMonth]);

  // タブ切替
  const handleModeChange = useCallback(
    (mode: ViewMode) => {
      if (mode === 'highlight') {
        router.push(buildUrl('highlight', targetYearMonth));
      } else if (targetYearMonth) {
        router.push(buildUrl('timeline', targetYearMonth));
      }
    },
    [router, buildUrl, targetYearMonth]
  );

  useEffect(() => {
    // 本番モードで未認証の場合はログイン画面へ
    if (!useMock && status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, useMock, router]);

  // 本番モード: セッション読み込み中
  if (!useMock && status === 'loading') {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-8">
        {/* ヘッダー */}
        <header className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            ExWHYZ Timeline
          </h1>
          <p className="text-gray-400 text-sm">
            輝きの軌跡 × あなたの思い出
          </p>
        </header>

        {/* モード切替タブ */}
        <ViewModeTabs
          currentMode={viewMode}
          onModeChange={handleModeChange}
          hasTargetMonth={targetYearMonth !== null}
          targetLabel={targetYearMonth ? formatTargetLabel(targetYearMonth) : undefined}
        />

        {/* コンテンツ */}
        <div className="mt-6">
          {viewMode === 'highlight' ? (
            <HighlightsContainer
              onSelectMonth={handleSelectMonth}
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
            />
          ) : (
            <TimelineContainer
              timeline={timelineData.timeline}
              categories={timelineData.categories}
              targetYearMonth={targetYearMonth ?? undefined}
              onMonthChange={handleMonthChange}
              onBackToHighlight={handleBackToHighlight}
            />
          )}
        </div>
      </div>
    </main>
  );
}