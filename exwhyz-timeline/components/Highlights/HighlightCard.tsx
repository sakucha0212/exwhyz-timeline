'use client';

interface HighlightItem {
  id: string;
  type: 'tour' | 'live' | 'announcement' | 'event' | 'release';
  title: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

interface HighlightCardProps {
  item: HighlightItem;
  onSelectMonth: (yearMonth: string) => void;
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    tour: '',
    live: '',
    announcement: '📢',
    event: '',
    release: '',
  };
  return icons[type] ?? '';
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

function formatYearMonth(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    tour: 'bg-pink-950/40 text-pink-400/80 border-pink-900/50',
    live: 'bg-green-950/40 text-green-400/80 border-green-900/50',
    announcement: 'bg-blue-950/40 text-blue-400/80 border-blue-900/50',
    event: 'bg-purple-950/40 text-purple-400/80 border-purple-900/50',
    release: 'bg-yellow-950/40 text-yellow-400/80 border-yellow-900/50',
  };
  return colors[type] ?? 'bg-gray-800 text-gray-300 border-gray-700';
}

function getTypeBorderColor(type: string): string {
  const colors: Record<string, string> = {
    tour: 'border-l-pink-500/60',
    live: 'border-l-green-500/60',
    announcement: 'border-l-blue-500/60',
    event: 'border-l-purple-500/60',
    release: 'border-l-yellow-500/60',
  };
  return colors[type] ?? 'border-l-gray-600';
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    tour: 'ツアー',
    live: 'ライブ',
    announcement: '発表',
    event: 'イベント',
    release: 'リリース',
  };
  return labels[type] ?? type;
}

function hasDateRange(item: HighlightItem): boolean {
  return !!item.startDate && !!item.endDate;
}

function getDateStr(item: HighlightItem): string {
  return item.date ?? item.startDate!;
}

export default function HighlightCard({ item, onSelectMonth }: HighlightCardProps) {
  const targetYM = hasDateRange(item)
    ? formatYearMonth(item.startDate!)
    : formatYearMonth(getDateStr(item));

  const dateText = hasDateRange(item)
    ? `${formatDate(item.startDate!)} 〜 ${formatDate(item.endDate!)}`
    : formatDate(getDateStr(item));

  return (
    <div
      className={`border border-gray-700 rounded-lg p-3 bg-gray-900 cursor-pointer
        hover:border-exwhyz-pink-light transition-colors border-l-4 ${getTypeBorderColor(item.type)}`}
      onClick={() => onSelectMonth(targetYM)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectMonth(targetYM);
        }
      }}
      title={`${item.title}の月を見る`}
    >
      {/* トップ行：左=タイトル、右=バッジ */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-base flex-shrink-0">{getTypeIcon(item.type)}</span>
          <h3 className="text-white font-semibold text-sm leading-snug truncate">
            {item.title}
          </h3>
        </div>
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] border whitespace-nowrap flex-shrink-0 ${getTypeColor(item.type)}`}>
          {getTypeLabel(item.type)}
        </span>
      </div>

      {/* 日付/期間 */}
      <p className="text-gray-400 text-xs mt-1">
        {dateText}
      </p>
    </div>
  );
}