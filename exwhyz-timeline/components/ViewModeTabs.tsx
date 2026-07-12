'use client';

export type ViewMode = 'highlight' | 'timeline';

interface ViewModeTabsProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  hasTargetMonth: boolean;
  targetLabel?: string;
}

export default function ViewModeTabs({
  currentMode,
  onModeChange,
  hasTargetMonth,
  targetLabel,
}: ViewModeTabsProps) {
  return (
    <div className="sticky top-0 z-50 bg-black border-b border-gray-700">
      <div className="max-w-6xl mx-auto flex">
        {/* ハイライトタブ */}
        <button
          onClick={() => onModeChange('highlight')}
          className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
            currentMode === 'highlight'
              ? 'border-exwhyz-pink text-exwhyz-pink-light'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <span className="mr-1.5">📊</span>
          ハイライト
        </button>

        {/* タイムラインタブ */}
        <button
          onClick={() => onModeChange('timeline')}
          disabled={!hasTargetMonth}
          className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
            currentMode === 'timeline'
              ? 'border-exwhyz-pink text-exwhyz-pink-light'
              : !hasTargetMonth
                ? 'border-transparent text-gray-700 cursor-not-allowed'
                : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
          title={
            !hasTargetMonth
              ? 'ハイライトから月を選択してください'
              : targetLabel
                ? `${targetLabel}のタイムラインを見る`
                : 'タイムラインを見る'
          }
        >
          <span className="mr-1.5">📅</span>
          タイムライン
          {targetLabel && (
            <span className="ml-1 text-xs text-gray-500">({targetLabel})</span>
          )}
        </button>
      </div>
    </div>
  );
}