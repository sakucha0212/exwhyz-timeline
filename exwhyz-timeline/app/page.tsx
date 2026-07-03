'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import TimelineContainer from '@/components/Timeline/TimelineContainer';
import timelineData from '@/data/timeline.json';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  useEffect(() => {
    // 本番モードで未認証の場合はログイン画面へ
    if (!useMock && status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, useMock, router]);

  // 本番モード: セッション読み込み中
  if (!useMock && status === 'loading') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            ExWHYZ Timeline
          </h1>
          <p className="text-gray-400 text-sm">
            輝きの軌跡 × あなたの思い出
          </p>
        </header>

        {/* タイムライン（月ナビゲーション・更新ボタンは TimelineContainer 内に統合） */}
        <TimelineContainer
          timeline={timelineData.timeline}
          categories={timelineData.categories}
        />
      </div>
    </main>
  );
}
