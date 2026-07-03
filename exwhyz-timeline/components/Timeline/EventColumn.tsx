import CategoryBadge from './CategoryBadge';

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

interface EventColumnProps {
  events: Event[];
  categories: Category[];
}

export default function EventColumn({ events, categories }: EventColumnProps) {
  // カテゴリマップを作成
  const categoryMap = Object.fromEntries(
    categories.map(cat => [cat.id, cat])
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-2">活動情報</h3>
      {events.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <p className="text-gray-500 text-sm">この日の活動情報はありません</p>
        </div>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-pink-500 transition-colors"
          >
            {/* カテゴリバッジ */}
            <div className="mb-3">
              <CategoryBadge category={categoryMap[event.category]} />
            </div>

            {/* タイトル */}
            <h4 className="text-xl font-bold text-white mb-2">
              {event.title}
            </h4>

            {/* 説明 */}
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              {event.description}
            </p>

            {/* 公式ソースリンク */}
            {event.officialSource && (
              <a
                href={event.officialSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-pink-400 hover:text-pink-300 transition-colors"
              >
                <span>公式情報を見る</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        ))
      )}
    </div>
  );
}
