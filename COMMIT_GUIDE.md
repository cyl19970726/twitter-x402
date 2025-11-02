# Git 提交指南

## 📝 需要提交的文件清单

### ✅ 必须提交
- `src/` - 所有源代码（除了 *.backup 文件）
- `api/index.js` - Vercel 入口
- `package.json` - 依赖配置
- `tsconfig.json` - TypeScript 配置
- `.env.example` - 环境变量模板（**不含**真实密钥）
- `.gitignore` - Git 忽略规则
- `README.md` - 项目文档
- `docs/` - 所有文档
- `tests/` - 测试脚本

### ✅ 部署配置（推荐提交）
- `vercel.json` - Vercel 配置
- `railway.json` - Railway 配置
- `render.yaml` - Render 配置
- `Dockerfile` - Docker 配置
- `.dockerignore` - Docker 忽略规则

### ❌ 不要提交
- `.env` - **包含敏感信息！**
- `node_modules/` - 通过 `bun install` 安装
- `dist/` - 构建产物
- `*.backup` - 备份文件
- `.vercel/` - Vercel 本地缓存

---

## 🚀 快速提交步骤

### 1. 首次提交

```bash
# 初始化 Git（如果还没有）
git init

# 添加所有文件（.gitignore 会自动排除不需要的文件）
git add .

# 检查将要提交的文件
git status

# 提交
git commit -m "Initial commit: Twitter Space Summarizer Agent

- Add agent-improved.ts with per-entrypoint pricing
- Add Vercel/Railway/Render deployment configs
- Add comprehensive documentation
- Configure x402 payments and ERC-8004 support

🤖 Generated with Claude Code"

# 添加远程仓库（替换为你的仓库 URL）
git remote add origin https://github.com/your-username/your-repo.git

# 推送到 GitHub
git push -u origin main
```

---

### 2. 后续提交

```bash
# 查看改动
git status
git diff

# 添加特定文件
git add src/agent-improved.ts
git add vercel.json

# 或添加所有改动
git add .

# 提交
git commit -m "Update Vercel configuration for Pro plan

- Set maxDuration to 800s (13.3 minutes)
- Increase memory to 3008MB
- Optimize for long-running Twitter Space processing"

# 推送
git push
```

---

## ⚠️ 提交前检查清单

在每次提交前，确认：

- [ ] `.env` 文件**没有**被添加到 Git
- [ ] 所有敏感信息（API keys, 私钥）都在 `.env` 中，而不是代码里
- [ ] `.gitignore` 包含了所有不应该提交的文件
- [ ] `README.md` 和文档是最新的
- [ ] 代码可以正常运行（`bun run src/index.ts`）

---

## 🔍 验证命令

### 检查将要提交的文件

```bash
# 查看暂存的文件
git diff --cached --name-only

# 查看未暂存的改动
git diff --name-only

# 查看所有改动
git status
```

### 确认没有敏感信息

```bash
# 搜索可能的敏感信息
git grep -i "api_key"
git grep -i "private_key"
git grep -i "sk-proj-"

# 如果找到任何结果，检查是否在 .env.example 中（可以）还是在其他文件中（不可以）
```

---

## 🌿 分支策略

### 开发流程

```bash
# 创建功能分支
git checkout -b feature/add-new-entrypoint

# 开发和提交
git add .
git commit -m "Add new entrypoint for quick summary"

# 推送分支
git push -u origin feature/add-new-entrypoint

# 在 GitHub 创建 Pull Request
# 合并后删除分支
git checkout main
git pull
git branch -d feature/add-new-entrypoint
```

---

## 📊 提交历史

### 查看提交记录

```bash
# 查看最近的提交
git log --oneline -10

# 查看特定文件的历史
git log --follow src/agent-improved.ts

# 查看代码改动统计
git log --stat
```

---

## 🔄 与 Vercel 集成

Vercel 会自动监听 GitHub 仓库的推送：

```bash
# 推送到任意分支 → 创建预览部署
git push origin feature-branch

# 推送到 main 分支 → 部署到生产环境
git push origin main
```

---

## ⚠️ 常见错误

### 错误 1: 意外提交了 .env

如果不小心提交了 `.env`：

```bash
# 从 Git 移除（但保留本地文件）
git rm --cached .env

# 提交移除操作
git commit -m "Remove .env from Git"

# 推送
git push

# ⚠️ 警告：已经推送的 .env 内容仍在 Git 历史中！
# 需要更换所有 API keys 和私钥！
```

### 错误 2: 提交了 node_modules

```bash
# 从 Git 移除
git rm -r --cached node_modules

# 确保 .gitignore 包含 node_modules/
echo "node_modules/" >> .gitignore

# 提交
git commit -m "Remove node_modules from Git"
git push
```

---

## 📚 更多资源

- [Git 基础教程](https://git-scm.com/book/zh/v2)
- [GitHub 使用指南](https://docs.github.com/zh)
- [Vercel Git 集成](https://vercel.com/docs/git)
