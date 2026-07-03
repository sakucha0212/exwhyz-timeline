import CategoryBadge from './CategoryBadge';
import TweetEmbed from './TweetEmbed';

interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
}

interface OfficialSource {
  type: string;
  url: string;
}

interface Event {
  id: string;
  date: string;
  title: string;
  category: string;
  description: string;
  officialSource?: OfficialSource;
  searchKeywords: string[];
  dateRange: {
    start: string;
    end: string;
  };
  media: any[];
  tags: string[];
}

interface UserTweet {
  tweetId: string;
}

interface EventCardProps {
  event: Event;
  category: Category;
  userTweets?: UserTweet[];
}

export default function EventCard({ event, category, userTweets = [] }: EventCardProps) {
  return (
    <article className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-pink-500 transition-colors">
      {/* イベントヘッダー */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-start justify-between mb-3">
          <time className="text-sm text-gray-500 font-mono">
            {event.date}
          </time>
          <CategoryBadge category={category} />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3">
          {event.title}
        </h2>
        
        <p className="text-gray-300 leading-relaxed">
          {event.description}
        </p>

        {/* 公式ソースリンク */}
        {event.officialSource && (
          <a 
            href={event.officialSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-4 text-sm text-pink-400 hover:text-pink-300 transition-colors"
          >
            <span>公式情報を見る</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* あなたの思い出セクション（X APIから取得したユーザーのポスト） */}
      {userTweets.length > 0 && (
        <div className="p-6 bg-gray-950">
          <h3 className="text-sm font-semibold text-pink-400 mb-4 flex items-center">
            <span className="mr-2">💭</span>
            あなたの思い出
          </h3>
          <div className="space-y-4">
            {userTweets.map((tweet) => (
              <TweetEmbed key={tweet.tweetId} tweetId={tweet.tweetId} />
            ))}
          </div>
        </div>
      )}

      {/* ポストが見つからない場合のメッセージ */}
      {userTweets.length === 0 && (
        <div className="p-6 bg-gray-950 text-center">
          <p className="text-gray-500 text-sm">
            この日の思い出ポストはまだありません
          </p>
        </div>
      )}
    </article>
  );
}
