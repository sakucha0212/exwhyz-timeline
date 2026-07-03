'use client';

import { TwitterTweetEmbed } from 'react-twitter-embed';

interface TweetEmbedProps {
  tweetId: string;
}

export default function TweetEmbed({ tweetId }: TweetEmbedProps) {
  const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;

  return (
    <div className="space-y-1">
      {/* ツイート埋め込み */}
      <div className="rounded-lg">
        <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: 'calc(100% / 0.8)', marginBottom: '-15%' }}>
          <TwitterTweetEmbed
            tweetId={tweetId}
            options={{
              theme: 'dark',
              width: '100%',
              conversation: 'none',
              cards: 'hidden'
            }}
          />
        </div>
      </div>
      
      {/* 小さなXで見るリンク（右下に配置） */}
      <div className="flex justify-end">
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-gray-300 transition-colors text-xs"
          title="Xで見る"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span className="text-xs">Xで見る</span>
        </a>
      </div>
    </div>
  );
}
