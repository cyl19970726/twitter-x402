'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface SpaceDetail {
  space: {
    spaceId: string;
    title: string;
    creator: string | null;
    participants: string[];
    duration: number;
    status: string;
    completedAt: string | null;
  };
  transcript?: string;
}

export default function SpaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;

  const [data, setData] = useState<SpaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Chat
  const [question, setQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ q: string; a: string }>>([]);

  useEffect(() => {
    loadSpace();
  }, [spaceId]);

  async function loadSpace() {
    try {
      setLoading(true);
      const response = await fetch(`/api/spaces/${spaceId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Space 不存在');
        }
        throw new Error('加载失败');
      }
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAskQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || chatLoading) return;

    try {
      setChatLoading(true);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId, question: question.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '提问失败');
      }

      const result = await response.json();
      setChatHistory([...chatHistory, { q: question.trim(), a: result.answer }]);
      setQuestion('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setChatLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || '加载失败'}</p>
          <Link
            href="/"
            className="text-purple-600 dark:text-purple-400 hover:underline"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const { space, transcript } = data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ← 返回
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {space.title}
                </h1>
                {space.creator && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    创建者: {space.creator}
                  </p>
                )}
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status - Processing */}
        {space.status !== 'completed' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 mb-8">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium">
              {space.status === 'pending' && '转录任务在队列中，预计 3-5 分钟完成'}
              {space.status === 'processing' && '正在处理转录任务...'}
              {space.status === 'failed' && '转录失败，请联系管理员'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Transcript */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                转录内容
              </h2>

              {transcript ? (
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                    {transcript}
                  </pre>
                </div>
              ) : (
                <p className="text-slate-600 dark:text-slate-400">
                  转录内容尚未生成
                </p>
              )}
            </div>
          </div>

          {/* Right: AI Chat */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                AI 问答
              </h2>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                使用 AI 分析这个 Space 的内容，每次提问需支付 0.5 USDC
              </p>

              {/* Chat History */}
              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {chatHistory.map((chat, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                      <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                        你: {chat.q}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {chat.a}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleAskQuestion} className="space-y-3">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="输入你的问题..."
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white resize-none"
                  rows={3}
                  disabled={chatLoading || space.status !== 'completed'}
                />
                <button
                  type="submit"
                  disabled={!question.trim() || chatLoading || space.status !== 'completed'}
                  className="w-full bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {chatLoading ? '提问中...' : '提问 (0.5 USDC)'}
                </button>
              </form>

              {space.status !== 'completed' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                  等待转录完成后可以提问
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Meta Info */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            详细信息
          </h3>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm text-slate-600 dark:text-slate-400">时长</dt>
              <dd className="text-lg font-semibold text-slate-900 dark:text-white">
                {formatDuration(space.duration)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600 dark:text-slate-400">状态</dt>
              <dd className="text-lg font-semibold text-slate-900 dark:text-white">
                {space.status === 'completed' && '✅ 已完成'}
                {space.status === 'processing' && '⏳ 处理中'}
                {space.status === 'pending' && '📋 队列中'}
                {space.status === 'failed' && '❌ 失败'}
              </dd>
            </div>
            {space.participants && space.participants.length > 0 && (
              <div>
                <dt className="text-sm text-slate-600 dark:text-slate-400">参与者</dt>
                <dd className="text-lg font-semibold text-slate-900 dark:text-white">
                  {space.participants.length} 人
                </dd>
              </div>
            )}
            {space.completedAt && (
              <div>
                <dt className="text-sm text-slate-600 dark:text-slate-400">完成时间</dt>
                <dd className="text-lg font-semibold text-slate-900 dark:text-white">
                  {new Date(space.completedAt).toLocaleDateString('zh-CN')}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </main>
    </div>
  );
}
