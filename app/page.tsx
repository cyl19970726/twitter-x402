'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface Space {
  spaceId: string;
  title: string;
  creator: string | null;
  participants: string[];
  duration: number;
  completedAt: string;
}

export default function Dashboard() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSpaces();
  }, []);

  async function loadSpaces() {
    try {
      setLoading(true);
      const response = await fetch('/api/spaces?limit=50');
      if (!response.ok) {
        throw new Error('Failed to load spaces');
      }
      const data = await response.json();
      setSpaces(data.spaces || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Twitter Space 转录库
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                浏览和分析已转录的 Twitter Spaces
              </p>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* CTA Section */}
        <div className="mb-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-2">转录你的 Twitter Space</h2>
          <p className="text-lg mb-4 opacity-90">
            只需 0.2 USDC，将任何 Twitter Space 转录为文字，并使用 AI 进行分析
          </p>
          <Link
            href="/transcribe"
            className="inline-block bg-white text-purple-600 font-semibold px-6 py-3 rounded-lg hover:bg-opacity-90 transition"
          >
            开始转录 →
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {spaces.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              已转录 Spaces
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              0.2 USDC
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              转录价格
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              0.5 USDC
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              AI 聊天价格
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">加载中...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadSpaces}
              className="mt-4 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              重试
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && spaces.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">
              还没有转录的 Spaces，成为第一个吧！
            </p>
          </div>
        )}

        {/* Spaces Grid */}
        {!loading && !error && spaces.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spaces.map((space) => (
              <Link
                key={space.spaceId}
                href={`/spaces/${space.spaceId}`}
                className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all hover:shadow-lg overflow-hidden"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                    {space.title}
                  </h3>

                  {space.creator && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      创建者: {space.creator}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500 mb-3">
                    <span>{formatDuration(space.duration)}</span>
                    <span>•</span>
                    <span>{formatDate(space.completedAt)}</span>
                  </div>

                  {space.participants && space.participants.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs text-slate-500 dark:text-slate-500">
                        参与者:
                      </span>
                      <div className="flex -space-x-2">
                        {space.participants.slice(0, 3).map((participant, idx) => (
                          <div
                            key={idx}
                            className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs text-white font-semibold"
                            title={participant}
                          >
                            {participant.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {space.participants.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400">
                            +{space.participants.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-600 dark:text-purple-400 font-medium">
                      查看转录 →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
