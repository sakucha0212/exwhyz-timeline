'use client';

import { useState } from 'react';
import DayEntry from './DayEntry';
import MonthPagination from './MonthPagination';
import { useMonthlyTwitterData } from '@/hooks/useMonthlyTwitterData';
import { getCurrentYearMonth, isCurrentMonth as checkIsCurrentMonth } from '@/lib/idb-cache';

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
}

export default function TimelineContainer({ timeline, categories }: TimelineContainerProps) {
  // 現在表示中の年月（デフォルト: 当月）
  const [currentYearMonth, setCurrentYearMonth] = useState<string>(getCurrentYearMonth());

  // 月単位ツイートデータ取得フック
  const { tweets, loading, error, rateLimitError, lastFetchedAt, refresh } =
    useMonthlyTwitterData(currentYearMonth);

  const isCurrent = checkIsCurrentMonth(currentYearMonth);

  // 空日付（活動情報・ツイートなし）を非表示にするフラグ（デフォルト: true）
  const [hideEmptyDays, setHideEmptyDays] = useState<boolean>(true);

  // ── 選択月の全日付を生成 ──────────────────────────────────────────────
  const allDisplayDates = new Set<string>();

  // 選択月の1日〜末日を全て追加
  const [ymYear, ymMonth] = currentYearMonth.split('-').map(Number);
  const daysInMonth = new Date(ymYear, ymMonth, 0).getDate();
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
      </div>
    </>
  );
}
