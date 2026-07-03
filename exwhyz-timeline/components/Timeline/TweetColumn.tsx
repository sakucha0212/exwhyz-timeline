import TweetEmbed from './TweetEmbed';

interface Tweet {
  tweetId: string;
  note?: string;
}

interface TweetColumnProps {
  tweets: Tweet[];
  loading?: boolean;
}

export default function TweetColumn({ tweets, loading = false }: TweetColumnProps) {
  return (
    <div className="space-y-4 lg:pl-0 pl-10 lg:border-l-0 border-l border-gray-700">
      <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
        <span className="mr-2">💭</span>
        あなたのTweet
      </h3>

      {/* ローディング中: スケルトン UI を表示 */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[0, 1].map((i) => (
            <div key={i} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="h-3 bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-700 rounded w-full mb-2" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : tweets.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <p className="text-gray-600 text-sm">この日はTweetがありません</p>
        </div>
      ) : (
        tweets.map((tweet, index) => (
          <div key={`${tweet.tweetId}-${index}`} className="space-y-2">
            {tweet.note && (
              <p className="text-gray-400 text-xs italic">
                {tweet.note}
              </p>
            )}
            <TweetEmbed tweetId={tweet.tweetId} />
          </div>
        ))
      )}
    </div>
  );
}
