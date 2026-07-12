'use client';

import { useState, useMemo } from 'react';
import DayEntry from './DayEntry';
import MonthPagination from './MonthPagination';
import { useMonthlyTwitterData } from '@/hooks/useMonthlyTwitterData';
import { getCurrentYearMonth, isCurrentMonth as checkIsCurrentMonth } from '@/lib/idb-cache';
import { ARCHIVE_START_DATE_CLIENT, ARCHIVE_END_DATE_CLIENT } from '@/lib/constants';

function toYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getArchiveStartYM(): string {
  return ARCHIVE_START_DATE_CLIENT.slice(0, 7);
}

function getArchiveEndYM(): string {
  return ARCHIVE_END_DATE_CLIENT.slice(0, 7);
}

interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
}

interface Event {
  id: string;
  title: string;
  category: string;
  description: string;
  officialSource?: {
    type: string;
    url: string;
  };
  tags: string[];
}

interface DayData {
  date: string;
  events: Event[];
}

interface TimelineContainerProps {
  timeline: DayData[];
  categories: Category[];
  /** 外部から指定する初期/現在年月（ハイライトから遷移時に使用） */
  targetYearMonth?: string;
  /** 月変更時のコールバック（親コンポーネントに通知） */
  onMonthChange?: (yearMonth: string) => void;
  /** ハイライトに戻るコールバック */
  onBackToHighlight?: () => void;
}

export default function TimelineContainer({
  timeline,
  categories,
  targetYearMonth,
  onMonthChange,
  onBackToHighlight,
}: TimelineContainerProps) {
  // 現在表示中の年月（デフォルト: 当月、外部指定があればそちらを優先）
  const [currentYearMonth, setCurrentYearMonth] = useState<string>(
    targetYearMonth ?? getCurrentYearMonth()
  );

  // 月単位ツイートデータ取得フック
  const { tweets, loading, error, rateLimitError, lastFetchedAt, refresh } =
    useMonthlyTwitterData(currentYearMonth);

  const isCurrent = checkIsCurrentMonth(currentYearMonth);

  // 空日付（活動情報・ツイートなし）を非表示にするフラグ（デフォルト: true）
  const [hideEmptyDays, setHideEmptyDays] = useState<boolean>(true);

  // ── 前月・次月の計算 ──────────────────────────────────────────────────
  const [ymYear, ymMonth] = currentYearMonth.split('-').map(Number);

  const archiveStartYM = useMemo(() => getArchiveStartYM(), []);
  const archiveEndYM = useMemo(() => getArchiveEndYM(), []);

  const prevMonth = ymMonth === 1 ? 12 : ymMonth - 1;
  const prevYear = ymMonth === 1 ? ymYear - 1 : ymYear;
  const prevYM = toYearMonth(prevYear, prevMonth);

  const nextMonth = ymMonth === 12 ? 1 : ymMonth + 1;
  const nextYear = ymMonth === 12 ? ymYear + 1 : ymYear;
  const nextYM = toYearMonth(nextYear, nextMonth);

  const isPrevDisabled = prevYM < archiveStartYM;
  const isNextDisabled = nextYM > archiveEndYM;

  // ── 選択月の全日付を生成 ──────────────────────────────────────────────
  const allDisplayDates = new Set<string>();

  // 選択月の1日〜末日を全て追加
  const [ymYear2, ymMonth2] = currentYearMonth.split('-').map(Number);
  const daysInMonth = new Date(ymYear2, ymMonth2, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYearMonth}-${String(d).padStart(2, '0')}`;
    allDisplayDates.add(dateStr);
  }

  // 日付を昇順ソート
  const sortedDates = Array.from(allDisplayDates).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  );

  // ── データマップ ──────────────────────────────────────────────────────
  const tweetsMap = Object.fromEntries(tweets.map((t) => [t.date, t.items]));
  const eventsMap = Object.fromEntries(timeline.map((t) => [t.date, t.events]));

  const getTweetsForDate = (date: string) => tweetsMap[date] || [];
  const getEventsForDate = (date: string) => eventsMap[date] || [];

  // ── フィルタリング ────────────────────────────────────────────────────
  // hideEmptyDays が true の場合、イベントもツイートもない日を除外
  const filteredDates = hideEmptyDays
    ? sortedDates.filter(
        (date) => getEventsForDate(date).length > 0 || getTweetsForDate(date).length > 0
      )
    : sortedDates;

  // ── エラー表示 ────────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <MonthPagination
          currentYearMonth={currentYearMonth}
          onMonthChange={setCurrentYearMonth}
          loading={false}
          isCurrentMonth={isCurrent}
          onRefresh={isCurrent ? refresh : undefined}
          lastFetchedAt={lastFetchedAt}
          rateLimitError={rateLimitError}
          hideEmptyDays={hideEmptyDays}
          onToggleHideEmptyDays={() => setHideEmptyDays((prev) => !prev)}
        />
        <div className="mt-8 text-center text-red-400 text-sm">
          エラー: {error}
        </div>
      </>
    );
  }

  return (
    <>
      {/* 月ナビゲーション */}
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

      {/* タイムライン本体 */}
      <div className="space-y-8 mt-4">
        {loading ? (
          // ローディング中: スケルトン表示
          <div className="space-y-8 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="mb-8">
                <div className="mb-4 pb-2 border-b border-gray-700">
                  <div className="h-5 bg-gray-800 rounded w-48" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-800 rounded w-24 mb-2" />
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                      <div className="h-3 bg-gray-700 rounded w-3/4 mb-3" />
                      <div className="h-3 bg-gray-700 rounded w-full mb-2" />
                      <div className="h-3 bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-800 rounded w-24 mb-2" />
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                      <div className="h-3 bg-gray-700 rounded w-3/4 mb-3" />
                      <div className="h-3 bg-gray-700 rounded w-full mb-2" />
                      <div className="h-3 bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredDates.length === 0 ? (
          // データなし
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-2">📭</p>
            <p>この月のデータはありません</p>
          </div>
        ) : (
          filteredDates.map((date) => (
            <DayEntry
              key={date}
              id={`date-${date}`}
              date={date}
              events={getEventsForDate(date)}
              tweets={getTweetsForDate(date)}
              categories={categories}
              loading={false}
            />
          ))
        )}

        {/* 下部ナビゲーション（前月/次月 + ハイライトに戻る） */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-700">
          <button
            onClick={() => setCurrentYearMonth(prevYM)}
            disabled={isPrevDisabled}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:text-gray-300"
            title="前月へ"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            前月（{prevMonth}月）
          </button>

          {onBackToHighlight && (
            <button
              onClick={onBackToHighlight}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
              title="ハイライト画面に戻る"
            >
              ハイライトに戻る
            </button>
          )}

          <button
            onClick={() => setCurrentYearMonth(nextYM)}
            disabled={isNextDisabled}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:text-gray-300"
            title="次月へ"
          >
            次月（{nextMonth}月）
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
