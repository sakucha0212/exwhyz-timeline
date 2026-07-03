'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            ExWHYZ Timeline
          </h1>
          <p className="text-gray-400 text-sm">
            輝きの軌跡 × あなたの思い出
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-4">
            ログインが必要です
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            あなたのXアカウントでログインして、タイムラインを表示します。
          </p>

          <button
            onClick={() => signIn('twitter', { callbackUrl: '/' })}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Xでログイン
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs">
            ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます。
          </p>
        </div>
      </div>
    </main>
  );
}
