'use client';

import { useState, useMemo } from 'react';

interface YearMonthNavProps {
  /** タイムラインに存在する全日付（YYYY-MM-DD 形式、ソート済み） */
  dates: string[];
  /** 空日を非表示にするかどうか */
  hideEmptyDays: boolean;
  /** 空日非表示オプションの変更コールバック */
  onHideEmptyDaysChange: (value: boolean) => void;
}

export default function YearMonthNav({ dates, hideEmptyDays, onHideEmptyDaysChange }: YearMonthNavProps) {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // 年一覧を生成（重複排除・降順）
  const years = useMemo(() => {
    const yearSet = new Set(dates.map(d => d.slice(0, 4)));
    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
  }, [dates]);

  // 選択中の年に存在する月一覧を生成
  const months = useMemo(() => {
    if (!selectedYear) return [];
    const monthSet = new Set(
      dates
        .filter(d => d.startsWith(selectedYear))
        .map(d => d.slice(5, 7))
    );
    return Array.from(monthSet).sort((a, b) => Number(b) - Number(a));
  }, [dates, selectedYear]);

  // 年が変わったら月をリセット
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth('');
  };

  // 月が選択されたらスクロール
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (!selectedYear || !month) return;

    // 対象年月の最初の DayEntry の id へスクロール
    const targetPrefix = `${selectedYear}-${month}`;
    const targetDate = dates.find(d => d.startsWith(targetPrefix));
    if (targetDate) {
      const el = document.getElementById(`date-${targetDate}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-black border-b border-gray-700 py-3 px-4">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <span className="text-gray-400 text-sm whitespace-nowrap">📅 ジャンプ:</span>

        {/* 年ドロップダウン */}
        <select
          value={selectedYear}
          onChange={(e) => handleYearChange(e.target.value)}
          className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">年を選択</option>
          {years.map(year => (
            <option key={year} value={year}>{year}年</option>
          ))}
        </select>

        {/* 月ドロップダウン（年が選択されている場合のみ有効） */}
        <select
          value={selectedMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          disabled={!selectedYear}
          className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <option value="">月を選択</option>
          {months.map(month => (
            <option key={month} value={month}>{Number(month)}月</option>
          ))}
        </select>

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
