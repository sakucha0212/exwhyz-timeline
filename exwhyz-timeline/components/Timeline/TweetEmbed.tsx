'use client';

import { TwitterTweetEmbed } from 'react-twitter-embed';

interface TweetEmbedProps {
  tweetId: string;
}

export default function TweetEmbed({ tweetId }: TweetEmbedProps) {
  return (
    <div className="rounded-lg">
      <div style={{ zoom: 0.85 }}>
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
  );
}
