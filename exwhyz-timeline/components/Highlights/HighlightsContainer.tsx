'use client';

import { useState, useMemo } from 'react';
import HighlightCard from './HighlightCard';
import YearSection from './YearSection';
import FilterBar from './FilterBar';
import highlightsData from '@/data/highlights.json';

interface HighlightItem {
  id: string;
  type: 'tour' | 'live' | 'announcement' | 'event' | 'release';
  title: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

interface HighlightsContainerProps {
  onSelectMonth: (yearMonth: string) => void;
  activeFilters: Set<string>;
  onFilterChange: (filters: Set<string>) => void;
}

function sortByDate(a: HighlightItem, b: HighlightItem): number {
  const aDate = a.endDate ?? a.date!;
  const bDate = b.endDate ?? b.date!;
  return bDate.localeCompare(aDate); // 降順
}

function getYear(item: HighlightItem): number {
  const dateStr = item.startDate ?? item.date!;
  return parseInt(dateStr.split('-')[0], 10);
}

export default function HighlightsContainer({
  onSelectMonth,
  activeFilters,
  onFilterChange,
}: HighlightsContainerProps) {
  const allItems = useMemo(() => (highlightsData as HighlightItem[]).sort(sortByDate), []);

  // 全件数マップ
  const allCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allItems.forEach((item) => {
      counts[item.type] = (counts[item.type] ?? 0) + 1;
    });
    return counts;
  }, [allItems]);

  // フィルタリング
  const items = useMemo(() => {
    if (activeFilters.size === 0) return allItems;
    return allItems.filter((item) => activeFilters.has(item.type));
  }, [allItems, activeFilters]);

  // 年別にグループ化
  const groupedByYear: Map<number, HighlightItem[]> = new Map();
  items.forEach((item) => {
    const year = getYear(item);
    if (!groupedByYear.has(year)) {
      groupedByYear.set(year, []);
    }
    groupedByYear.get(year)!.push(item);
  });

  // 年降順でソート
  const sortedYears = Array.from(groupedByYear.keys()).sort((a, b) => b - a);

  return (
    <div>
      <FilterBar
        counts={allCounts}
        activeFilters={activeFilters}
        onFilterChange={onFilterChange}
      />

      {sortedYears.map((year) => {
        const yearItems = groupedByYear.get(year)!;
        return (
          <YearSection key={year} year={year} count={yearItems.length}>
            {yearItems.map((item) => (
              <HighlightCard key={item.id} item={item} onSelectMonth={onSelectMonth} />
            ))}
          </YearSection>
        );
      })}
    </div>
  );
}