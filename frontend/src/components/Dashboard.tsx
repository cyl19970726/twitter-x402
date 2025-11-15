import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '../hooks/useAuth';
import { usePayment } from '../hooks/usePayment';
import { apiClient } from '../lib/api';

interface Space {
  id: number;
  spaceId: string;
  spaceUrl: string;
  title: string;
  status: string;
  completedAt?: string;
  audioDuration?: number;
  transcriptLength?: number;
}

interface UserStats {
  wallet: string;
  stats: {
    spacesOwned: number;
    transcriptionsPurchased: number;
    chatsUnlocked: number;
    chatQueries: number;
    totalSpentUSDC: number;
  };
}

export function Dashboard() {
  const { isConnected, getAuthParams } = useAuth();
  const { invokeEntrypoint, isProcessing } = usePayment();

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      loadDashboardData();
    }
  }, [isConnected]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const authParams = await getAuthParams();
      const [spacesData, statsData] = await Promise.all([
        apiClient.getMySpaces(authParams),
        apiClient.getUserStats(authParams),
      ]);
      setSpaces(spacesData.spaces || []);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTranscribe = async () => {
    const spaceUrl = prompt('🎙️ Enter Twitter Space URL:');
    if (!spaceUrl) return;

    try {
      setError(null);
      await invokeEntrypoint('transcribe-space', { spaceUrl });
      await loadDashboardData();
      alert('✅ Transcription purchased!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isConnected) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[10px] opacity-50">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-pink-500 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
          <div className="max-w-4xl w-full text-center space-y-12">
            {/* Logo & Title */}
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-600 rounded-2xl mb-6 transform hover:rotate-12 transition-transform">
                <span className="text-4xl">🎙️</span>
              </div>
              <h1 className="text-6xl md:text-7xl font-black text-white mb-4">
                Twitter Space
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Agent
                </span>
              </h1>
              <p className="text-xl text-purple-200">
                AI-powered transcription • Base Network • x402 Payments
              </p>
            </div>

            {/* Connect Button */}
            <div className="flex justify-center">
              <div className="transform hover:scale-110 transition-all duration-300">
                <ConnectButton />
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              {[
                { icon: '📝', title: 'Transcribe', desc: '0.2 USDC per Space' },
                { icon: '💬', title: 'Chat', desc: 'AI Q&A for 0.5 USDC' },
                { icon: '🔍', title: 'Search', desc: 'Query multiple Spaces' },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group relative bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-white/30 transition-all hover:bg-white/10"
                >
                  <div className="text-5xl mb-4 transform group-hover:scale-125 group-hover:rotate-12 transition-all">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-purple-200 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/30 backdrop-blur-2xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl flex items-center justify-center">
              <span className="text-xl">🎙️</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Dashboard</h1>
              <p className="text-xs text-purple-300">Base Mainnet</p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4">
            <p className="text-red-200 flex items-center gap-2">
              <span>⚠️</span> {error}
            </p>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Spaces', value: stats.stats.spacesOwned, icon: '🎙️' },
              { label: 'Transcriptions', value: stats.stats.transcriptionsPurchased, icon: '📝' },
              { label: 'Chats', value: stats.stats.chatsUnlocked, icon: '💬' },
              { label: 'Spent', value: `$${stats.stats.totalSpentUSDC}`, icon: '💰' },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl group-hover:scale-125 transition-transform">{stat.icon}</span>
                  <span className="text-xs text-purple-300 uppercase tracking-wide">{stat.label}</span>
                </div>
                <p className="text-3xl font-black text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleTranscribe}
              disabled={isProcessing}
              className="relative group bg-white/20 hover:bg-white/30 backdrop-blur-xl rounded-2xl px-6 py-4 font-bold text-white transition-all disabled:opacity-50 border border-white/20 hover:border-white/40 hover:scale-105 transform"
            >
              <span className="relative z-10">
                {isProcessing ? '⏳ Processing...' : '📝 Transcribe (0.2 USDC)'}
              </span>
            </button>
            <button disabled className="bg-white/10 rounded-2xl px-6 py-4 font-bold text-white/50 cursor-not-allowed border border-white/10">
              💬 Chat (0.5 USDC)
            </button>
            <button disabled className="bg-white/10 rounded-2xl px-6 py-4 font-bold text-white/50 cursor-not-allowed border border-white/10">
              🔍 Search (0.9+ USDC)
            </button>
          </div>
        </div>

        {/* Spaces */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
          <h2 className="text-2xl font-black text-white mb-6">My Spaces</h2>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
          ) : spaces.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4 opacity-30">📭</div>
              <p className="text-purple-200">No spaces yet</p>
              <p className="text-purple-300/50 text-sm mt-2">Purchase a transcription to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {spaces.map((space) => (
                <div
                  key={space.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors truncate">
                        {space.title || space.spaceId}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-purple-300">
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${space.status === 'completed' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                          {space.status}
                        </span>
                        {space.audioDuration && <span>⏱️ {Math.floor(space.audioDuration / 60)}m</span>}
                        {space.transcriptLength && <span>📄 {space.transcriptLength}</span>}
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-semibold text-sm whitespace-nowrap transition-all hover:scale-105 transform">
                      View →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
