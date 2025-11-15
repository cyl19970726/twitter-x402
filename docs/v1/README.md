# Twitter Space Agent - Documentation v1

## 📚 文档导航

### 🏗️ 架构设计 (architecture/)
- [系统架构](architecture/system-architecture.md) - 统一服务架构、数据流、技术选型
- [前端架构](architecture/frontend.md) - React + RainbowKit 架构说明
- [数据库设计](architecture/database.md) - 数据库 Schema 和查询模式

### 🔌 API 文档 (api/)
- [API 端点](api/endpoints.md) - 所有 API 端点详细说明

### 🚀 部署运维 (deployment/)
- [Railway 部署](deployment/railway.md) - Railway 部署完整指南

### 📦 开发指南 (development/)
- [项目结构](development/project-structure.md) - 目录组织和包管理
- [开发环境](development/setup.md) - 本地开发环境搭建
- [变更日志](development/changelog.md) - 开发进度记录

### 📖 技术文档 (technical/)
- [数据流详解](technical/data-pipeline.md) - 4 阶段处理流程
- [支付协议](technical/x402-payment.md) - x402 + EIP-3009 支付原理

---

## 🎯 快速开始

### 本地开发
```bash
# 1. 安装依赖
bun install

# 2. 配置环境变量
cp .env.example .env

# 3. 启动后端
bun run dev

# 4. 启动前端（新终端）
bun run dev:frontend
```

### 部署到 Railway
参考 [Railway 部署指南](deployment/railway.md)

---

## 📝 版本历史

- **v1.0** - 基础转录功能
- **v2.0** - 统一架构 + React 前端 + 聊天功能

---

## 🔗 相关链接

- [x402 协议文档](https://docs.cdp.coinbase.com/x402)
- [RainbowKit 文档](https://rainbowkit.com)
- [agent-kit GitHub](https://github.com/coinbase/lucid-agents)
