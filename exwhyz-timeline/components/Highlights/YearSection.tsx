'use client';

import { useState } from 'react';

interface YearSectionProps {
  year: number;
  count: number;
  children: React.ReactNode;
}

export default function YearSection({ year, count, children }: YearSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden mb-3">
      {/* 年ヘッダー（アコーディオン開閉） */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-850 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{year}年</span>
          <span className="text-xs text-gray-400">({count}件)</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* カード一覧（タイムライン表示：単純な縦線） */}
      {isOpen && (
        <div className="border-l-2 border-gray-600 ml-2 pl-8 pr-3 pb-3 pt-1">
          <div className="space-y-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
