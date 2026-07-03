'use client';

interface RefreshButtonProps {
  onRefresh: () => void;
  lastFetchedAt: string | null;
  rateLimitError?: boolean;
  dailyLimitError?: boolean;
}

export default function RefreshButton({ onRefresh, lastFetchedAt, rateLimitError = false, dailyLimitError = false }: RefreshButtonProps) {
  const formatLastFetchedAt = (isoString: string | null) => {
    if (isoString === null) return '未取得';

    const fetched = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - fetched.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}日前に更新`;
    } else if (hours > 0) {
      return `${hours}時間前に更新`;
    } else if (minutes > 0) {
      return `${minutes}分前に更新`;
    } else {
      return 'たった今更新';
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onRefresh}
          disabled={dailyLimitError}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium
            ${dailyLimitError
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          最新のポストを取得
        </button>

        <span className="text-gray-500 text-sm">
          {formatLastFetchedAt(lastFetchedAt)}
        </span>
      </div>

      {/* 1日1回制限メッセージ */}
      {dailyLimitError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-400 text-sm max-w-md">
          <span>📅</span>
          <p className="font-medium">本日はすでに更新済みです。次回は明日以降に更新できます。</p>
        </div>
      )}

      {/* レート制限警告バナー */}
      {rateLimitError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-300 text-sm max-w-md">
          <span>⚠️</span>
          <p className="font-medium">現在ポストを更新できません。</p>
        </div>
      )}
    </div>
  );
}
