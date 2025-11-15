# 前端架构

## 技术栈

- **React 19** - UI 框架
- **RainbowKit 2.2** - 钱包连接 UI
- **Wagmi 2.19** - React Hooks for Ethereum
- **Viem 2.x** - 以太坊客户端库
- **TanStack Query 5** - 数据获取和缓存
- **Vite 7** - 构建工具
- **Tailwind CSS 4** - 样式框架
- **x402-fetch 0.7** - x402 支付客户端

## 目录结构

```
frontend/
├── src/
│   ├── components/          # React 组件
│   │   └── Dashboard.tsx
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useAuth.ts       # 钱包认证
│   │   └── usePayment.ts    # x402 支付
│   ├── lib/                 # 工具库
│   │   ├── wagmi.ts         # Wagmi/RainbowKit 配置
│   │   └── api.ts           # API 客户端
│   ├── types/               # TypeScript 类型定义
│   ├── App.tsx              # 根组件
│   ├── main.tsx             # 应用入口
│   └── index.css            # 全局样式
├── index.html               # HTML 入口
└── ../vite.config.ts        # Vite 配置
```

## 核心模块

### 1. 钱包连接 (RainbowKit + Wagmi)

**配置**: `src/lib/wagmi.ts`
```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia, base } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Twitter Space Agent',
  chains: [baseSepolia, base],
});
```

**特点**：
- 自动支持 MetaMask、Coinbase Wallet、WalletConnect 等
- 美观的连接 UI
- 自动网络切换提示
- 账户变更监听

### 2. 身份认证 Hook

**文件**: `src/hooks/useAuth.ts`

```typescript
export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const getAuthParams = async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `Sign in to Twitter Space Dashboard\nTimestamp: ${timestamp}`;
    const signature = await signMessageAsync({ message });

    return { wallet: address, signature, message, timestamp };
  };

  return { address, isConnected, getAuthParams };
}
```

**用途**：
- 获取钱包地址
- 生成认证签名
- 检查连接状态

### 3. x402 支付 Hook

**文件**: `src/hooks/usePayment.ts`

```typescript
export function usePayment() {
  const { data: walletClient } = useWalletClient();

  const invokeEntrypoint = async (entrypointKey, params) => {
    const signer = await createSigner('base-sepolia', walletClient);
    const fetchWithPayment = wrapFetchWithPayment(fetch, signer);

    return fetchWithPayment(`/entrypoints/${entrypointKey}/invoke`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  };

  return { invokeEntrypoint, isProcessing, isReady };
}
```

**特点**：
- 自动处理 402 Payment Required
- EIP-3009 签名支付（用户无 Gas）
- 支付状态追踪

### 4. API 客户端

**文件**: `src/lib/api.ts`

封装所有后端 API 调用：
- `getMySpaces()` - 获取用户 Spaces
- `searchSpaces()` - 搜索 Spaces
- `getUserStats()` - 获取用户统计
- `getPaymentHistory()` - 获取支付历史

## 数据流

```
用户操作
  ↓
Dashboard 组件
  ↓
├─ useAuth Hook ──→ 签名认证 ──→ API 请求
│                                    ↓
└─ usePayment Hook ──→ x402 支付 ──→ 后端 Entrypoint
                          ↓
                    MetaMask 签名
```

## 开发流程

### 本地开发

```bash
# 1. 启动后端
bun run dev

# 2. 启动前端（新终端）
bun run dev:frontend

# 3. 访问
# Frontend: http://localhost:3000
# Backend:  http://localhost:8787
```

### 构建部署

```bash
# 构建前端
bun run build:frontend

# 输出目录
public/app/
```

## 配置

### 环境变量

创建 `.env` 文件：
```bash
# Frontend
VITE_API_URL=http://localhost:8787
VITE_NETWORK=base-sepolia
VITE_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID
```

### Vite 代理配置

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/entrypoints': 'http://localhost:8787',
    },
  },
});
```

## 优势

**vs 原生 JS + viem**：
- ✅ 钱包连接更稳定
- ✅ UI/UX 更好（RainbowKit）
- ✅ 支持更多钱包类型
- ✅ 代码更简洁（React Hooks）
- ✅ TypeScript 类型安全
- ✅ 热更新开发体验

**vs Next.js**：
- ✅ 更轻量（不需要 SSR）
- ✅ 构建更快
- ✅ 部署更简单（静态文件）
- ✅ 适合 Dashboard 场景

## 扩展性

### 添加新组件

```typescript
// src/components/SpaceDetail.tsx
export function SpaceDetail({ spaceId }: { spaceId: string }) {
  const { getAuthParams } = useAuth();
  const [space, setSpace] = useState(null);

  useEffect(() => {
    const loadSpace = async () => {
      const auth = await getAuthParams();
      const data = await apiClient.getSpace(auth, spaceId);
      setSpace(data);
    };
    loadSpace();
  }, [spaceId]);

  return <div>{/* ... */}</div>;
}
```

### 添加新 Hook

```typescript
// src/hooks/useSpaces.ts
export function useSpaces() {
  const { getAuthParams } = useAuth();
  const [spaces, setSpaces] = useState([]);

  const loadSpaces = async () => {
    const auth = await getAuthParams();
    const data = await apiClient.getMySpaces(auth);
    setSpaces(data.spaces);
  };

  useEffect(() => { loadSpaces(); }, []);

  return { spaces, loadSpaces, isLoading };
}
```

## 注意事项

1. **WalletConnect Project ID**: 需要在 https://cloud.walletconnect.com 注册获取
2. **网络配置**: 开发环境使用 `base-sepolia`，生产环境使用 `base`
3. **CORS**: Vite 代理自动处理，部署时需要后端配置 CORS
4. **环境变量**: 前端环境变量必须以 `VITE_` 开头

## 性能优化

- ✅ Vite 原生 ESM（快速热更新）
- ✅ TanStack Query 自动缓存
- ✅ React 19 自动批处理更新
- ✅ Tailwind CSS JIT 编译
- ✅ 代码分割（动态 import）

## 安全性

- ✅ 签名认证（防止 CSRF）
- ✅ Timestamp 验证（防止重放攻击）
- ✅ x402 EIP-3009（无需 approve，更安全）
- ✅ MetaMask 签名确认（用户可见）
