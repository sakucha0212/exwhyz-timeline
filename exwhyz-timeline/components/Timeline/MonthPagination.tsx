'use client';

import { useMemo } from 'react';
import { ARCHIVE_START_DATE_CLIENT, ARCHIVE_END_DATE_CLIENT } from '@/lib/constants';

interface MonthPaginationProps {
  /** 現在表示中の年月 "YYYY-MM" */
  currentYearMonth: string;
  /** 月変更コールバック */
  onMonthChange: (ym: string) => void;
  /** データ取得中フラグ（ローディング中はボタンを無効化） */
  loading?: boolean;
  /** レート制限エラーフラグ */
  rateLimitError?: boolean;
  /** 最終取得日時（ISO 8601） */
  lastFetchedAt?: string | null;
  /** 更新ボタンのコールバック（当月のみ表示） */
  onRefresh?: () => void;
  /** 当月フラグ */
  isCurrentMonth?: boolean;
  /** 空日付（活動情報・ツイートなし）を非表示にするフラグ */
  hideEmptyDays?: boolean;
  /** 空日付非表示トグルのコールバック */
  onToggleHideEmptyDays?: () => void;
}

/** "YYYY-MM" → { year: number, month: number } */
function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split('-').map(Number);
  return { year: y, month: m };
}

/** { year, month } → "YYYY-MM" */
function toYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** ARCHIVE_START_DATE_CLIENT から "YYYY-MM" を抽出 */
function getArchiveStartYearMonth(): string {
  // ARCHIVE_START_DATE_CLIENT は "YYYY-MM-DDT..." 形式
  return ARCHIVE_START_DATE_CLIENT.slice(0, 7);
}

/** ARCHIVE_END_DATE_CLIENT から "YYYY-MM" を抽出 */
function getArchiveEndYearMonth(): string {
  // ARCHIVE_END_DATE_CLIENT は "YYYY-MM-DDT..." 形式
  return ARCHIVE_END_DATE_CLIENT.slice(0, 7);
}

/** 最終取得日時を人間が読みやすい形式に変換 */
function formatLastFetchedAt(isoString: string | null | undefined): string {
  if (!isoString) return '未取得';
  const fetched = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - fetched.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}日前に更新`;
  if (hours > 0) return `${hours}時間前に更新`;
  if (minutes > 0) return `${minutes}分前に更新`;
  return 'たった今更新';
}

export default function MonthPagination({
  currentYearMonth,
  onMonthChange,
  loading = false,
  rateLimitError = false,
  lastFetchedAt,
  onRefresh,
  isCurrentMonth = false,
  hideEmptyDays = true,
  onToggleHideEmptyDays,
}: MonthPaginationProps) {
  const archiveStartYM = getArchiveStartYearMonth();
  const archiveEndYM = getArchiveEndYearMonth();

  const { year: curYear, month: curMonth } = parseYearMonth(currentYearMonth);

  // 前月・次月の yearMonth を計算
  const prevYM = useMemo(() => {
    const m = curMonth - 1;
    return m < 1 ? toYearMonth(curYear - 1, 12) : toYearMonth(curYear, m);
  }, [curYear, curMonth]);

  const nextYM = useMemo(() => {
    const m = curMonth + 1;
    return m > 12 ? toYearMonth(curYear + 1, 1) : toYearMonth(curYear, m);
  }, [curYear, curMonth]);

  // 前月ボタンの disabled 判定（アーカイブ開始月より前には遷移不可）
  const isPrevDisabled = loading || prevYM < archiveStartYM;
  // 次月ボタンの disabled 判定（アーカイブ終了月より後には遷移不可）
  const isNextDisabled = loading || nextYM > archiveEndYM;

  // 年ドロップダウンの選択肢（アーカイブ開始年〜終了年）
  const years = useMemo(() => {
    const startYear = parseYearMonth(archiveStartYM).year;
    const endYear = parseYearMonth(archiveEndYM).year;
    const result: number[] = [];
    for (let y = endYear; y >= startYear; y--) {
      result.push(y);
    }
    return result;
  }, [archiveStartYM, archiveEndYM]);

  // 月ドロップダウンの選択肢（1〜12月、範囲外はdisabled）
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  const handleYearChange = (newYear: number) => {
    // 年が変わったとき、月は現在の月のまま（範囲外になる場合は境界値に補正）
    const candidate = toYearMonth(newYear, curMonth);
    if (candidate > archiveEndYM) {
      onMonthChange(archiveEndYM);
    } else if (candidate < archiveStartYM) {
      onMonthChange(archiveStartYM);
    } else {
      onMonthChange(candidate);
    }
  };

  const handleMonthChange = (newMonth: number) => {
    const candidate = toYearMonth(curYear, newMonth);
    if (candidate > archiveEndYM || candidate < archiveStartYM) return;
    onMonthChange(candidate);
  };

  const isMonthDisabled = (month: number): boolean => {
    const candidate = toYearMonth(curYear, month);
    return candidate > archiveEndYM || candidate < archiveStartYM;
  };

  return (
    <div className="sticky top-0 z-50 bg-black border-b border-gray-700 py-3 px-4">
      <div className="max-w-6xl mx-auto flex items-center gap-2">

        {/* 前月ボタン（左端） */}
        <button
          onClick={() => onMonthChange(prevYM)}
          disabled={isPrevDisabled}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0
            bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:text-gray-300"
          title="前月へ"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          前月
        </button>

        {/* 中央グループ（年月ドロップダウン・トグル・更新） */}
        <div className="flex-1 flex justify-center flex-wrap items-center gap-2">
          <select
            value={curYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            disabled={loading}
            className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-1.5 text-sm
              focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <select
            value={curMonth}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
            disabled={loading}
            className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-1.5 text-sm
              focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {months.map((m) => (
              <option key={m} value={m} disabled={isMonthDisabled(m)}>
                {m}月
              </option>
            ))}
          </select>

          {onToggleHideEmptyDays && (
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-sm text-gray-300">
              <input
                type="checkbox"
                checked={hideEmptyDays}
                onChange={onToggleHideEmptyDays}
                disabled={loading}
                className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-500
                  focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              空の日を非表示
            </label>
          )}

          {loading && (
            <span className="flex items-center gap-1.5 text-gray-400 text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              読み込み中...
            </span>
          )}

          {isCurrentMonth && onRefresh && (
            <div className="flex items-center gap-3">
              {lastFetchedAt && (
                <span className="text-gray-500 text-xs hidden sm:inline">
                  {formatLastFetchedAt(lastFetchedAt)}
                </span>
              )}
              <button
                onClick={onRefresh}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  bg-blue-600 hover:bg-blue-700 text-white
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                title="最新のポストを取得"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                更新
              </button>
            </div>
          )}
        </div>

        {/* 次月ボタン（右端） */}
        <button
          onClick={() => onMonthChange(nextYM)}
          disabled={isNextDisabled}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0
            bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:text-gray-300"
          title="次月へ"
        >
          次月
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* レート制限警告 */}
        {rateLimitError && (
          <div className="w-full flex items-center gap-2 px-3 py-2 mt-1 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-300 text-xs">
            <span>⚠️</span>
            <p>現在ポストを更新できません。しばらく時間をおいてから再試行してください。</p>
          </div>
        )}
      </div>
    </div>
  );
}
