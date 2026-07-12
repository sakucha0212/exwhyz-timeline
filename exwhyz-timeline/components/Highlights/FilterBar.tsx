'use client';

export type HighlightType = 'tour' | 'live' | 'announcement' | 'event' | 'release';

interface FilterBarProps {
  /** 全タイプの件数マップ */
  counts: Record<string, number>;
  /** 現在アクティブなフィルター（空 = すべて表示） */
  activeFilters: Set<string>;
  /** フィルター変更コールバック */
  onFilterChange: (filters: Set<string>) => void;
}

const TYPE_CONFIG: { key: string; label: string; color: string }[] = [
  { key: 'tour', label: 'ツアー', color: 'bg-pink-950/40 text-pink-400/80 border-pink-900/50' },
  { key: 'live', label: 'ライブ', color: 'bg-green-950/40 text-green-400/80 border-green-900/50' },
  { key: 'announcement', label: '発表', color: 'bg-blue-950/40 text-blue-400/80 border-blue-900/50' },
  { key: 'event', label: 'イベント', color: 'bg-purple-950/40 text-purple-400/80 border-purple-900/50' },
  { key: 'release', label: 'リリース', color: 'bg-yellow-950/40 text-yellow-400/80 border-yellow-900/50' },
];

const ALL_COLOR = 'bg-gray-800 text-gray-300 border-gray-700';
const ALL_ACTIVE_COLOR = 'bg-gray-700 text-white border-gray-500';

export default function FilterBar({ counts, activeFilters, onFilterChange }: FilterBarProps) {
  const isAllActive = activeFilters.size === 0;
  const totalCount = Object.values(counts).reduce((sum, c) => sum + c, 0);

  function handleAllClick() {
    onFilterChange(new Set());
  }

  function handleTypeClick(key: string) {
    const next = new Set(activeFilters);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onFilterChange(next);
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* すべてボタン */}
      <button
        onClick={handleAllClick}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs border font-medium transition-colors ${
          isAllActive ? ALL_ACTIVE_COLOR : ALL_COLOR
        }`}
      >
        すべて<span className="opacity-70">({totalCount})</span>
      </button>

      {/* 各タイプボタン */}
      {TYPE_CONFIG.map(({ key, label, color }) => {
        const isActive = isAllActive || activeFilters.has(key);
        const count = counts[key] ?? 0;
        return (
          <button
            key={key}
            onClick={() => handleTypeClick(key)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs border font-medium transition-colors ${
              isActive ? color : 'bg-gray-900/50 text-gray-600 border-gray-800'
            }`}
          >
            {label}<span className="opacity-70">({count})</span>
          </button>
        );
      })}
    </div>
  );
}