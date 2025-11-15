# 开发变更日志

## 2025-11-14

### ✅ 前端重构：迁移到 React + RainbowKit（已完成）

**问题**：
- 原生 viem 钱包连接不稳定
- 用户体验差，需要手写大量 UI 代码

**解决方案**：
- 使用 **React + RainbowKit + Wagmi** 替代原生 JS + viem
- RainbowKit：业界标准的钱包连接 UI，Coinbase 官方推荐
- Wagmi：React Hooks for Ethereum，与 viem 完美集成

**技术栈**：
```json
{
  "react": "^19.2.0",
  "@rainbow-me/rainbowkit": "^2.2.9",
  "wagmi": "^2.19.4",
  "viem": "2.x",
  "@tanstack/react-query": "^5.90.9",
  "vite": "^7.2.2",
  "tailwindcss": "^4.1.17",
  "x402-fetch": "^0.7.0"
}
```

**项目结构**：
```
frontend/
├── src/
│   ├── components/
│   │   └── Dashboard.tsx         # 主 Dashboard 组件
│   ├── hooks/
│   │   ├── useAuth.ts            # 钱包认证 Hook
│   │   └── usePayment.ts         # x402 支付 Hook
│   ├── lib/
│   │   ├── wagmi.ts              # RainbowKit/Wagmi 配置
│   │   └── api.ts                # API 客户端
│   ├── App.tsx                   # 根组件
│   ├── main.tsx                  # 入口文件
│   └── index.css                 # Tailwind CSS
└── index.html                    # HTML 入口
```

**核心功能**：
1. ✅ RainbowKit 钱包连接（自动支持 MetaMask、Coinbase Wallet 等）
2. ✅ API 认证（useAuth Hook）
3. ✅ x402 支付（usePayment Hook）
4. ✅ Dashboard 组件（统计、Spaces 列表、快速购买）
5. ✅ Vite 开发服务器（热更新）
6. ✅ Tailwind CSS 样式

**启动命令**：
```bash
# 前端开发服务器
bun run dev:frontend

# 后端 API 服务器
bun run dev

# 构建前端
bun run build:frontend
```

**访问地址**：
- Frontend: http://localhost:3000
- Backend API: http://localhost:8787

**配置文件**：
- `.env` - 环境变量配置
- `vite.config.ts` - Vite 配置（代理到后端）
- `tailwind.config.js` - Tailwind CSS 配置

**下一步**：
- 测试钱包连接和支付功能
- 添加更多 UI 组件（Space 详情、支付历史等）
- 部署到生产环境
