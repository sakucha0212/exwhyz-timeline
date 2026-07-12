'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import TimelineContainer from '@/components/Timeline/TimelineContainer';
import ViewModeTabs, { type ViewMode } from '@/components/ViewModeTabs';
import HighlightsContainer from '@/components/Highlights/HighlightsContainer';
import timelineData from '@/data/timeline.json';
import { getCurrentYearMonth } from '@/lib/idb-cache';

function formatTargetLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${year}年${month}月`;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  // ── モード管理 ────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('highlight');
  const [targetYearMonth, setTargetYearMonth] = useState<string>(getCurrentYearMonth());
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // ハイライトで月が選択されたらタイムラインモードに切り替え
  const handleSelectMonth = useCallback((yearMonth: string) => {
    setTargetYearMonth(yearMonth);
    setViewMode('timeline');
  }, []);

  // モード変更ハンドラ
  const handleModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    // タイムライン→ハイライトに戻るときは targetYearMonth を維持
  }, []);

  useEffect(() => {
    // 本番モードで未認証の場合はログイン画面へ
    if (!useMock && status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, useMock, router]);

  // 本番モード: セッション読み込み中
  if (!useMock && status === 'loading') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">読み込み中...</div>
      </main>
    );
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
              key={targetYearMonth ?? 'default'}
              timeline={timelineData.timeline}
              categories={timelineData.categories}
              targetYearMonth={targetYearMonth ?? undefined}
              onBackToHighlight={() => setViewMode('highlight')}
            />
          )}
        </div>
      </div>
    </main>
  );
}