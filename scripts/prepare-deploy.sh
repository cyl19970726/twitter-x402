#!/bin/bash

# Railway 部署准备脚本

echo "🚀 准备 Railway 部署..."
echo ""

# 1. 检查必要文件
echo "1️⃣ 检查部署文件..."
files=("railway.json" "Procfile" "nixpacks.toml" ".railwayignore")
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ $file 缺失"
  fi
done
echo ""

# 2. 检查环境变量
echo "2️⃣ 检查必需环境变量..."
required_vars=("PRIVATE_KEY" "OPENAI_API_KEY" "TWITTER_COOKIES")
for var in "${required_vars[@]}"; do
  if [ -n "${!var}" ]; then
    echo "   ✅ $var"
  else
    echo "   ⚠️  $var 未设置（部署时需要在 Railway 设置）"
  fi
done
echo ""

# 3. 运行测试
echo "3️⃣ 运行测试..."
if bun test:unit > /dev/null 2>&1; then
  echo "   ✅ 单元测试通过"
else
  echo "   ⚠️  单元测试失败（建议修复后再部署）"
fi
echo ""

# 4. 检查 TypeScript
echo "4️⃣ 检查 TypeScript..."
if bun run typecheck > /dev/null 2>&1; then
  echo "   ✅ TypeScript 编译通过"
else
  echo "   ❌ TypeScript 有错误（必须修复）"
  exit 1
fi
echo ""

# 5. 显示部署信息
echo "✅ 部署准备完成！"
echo ""
echo "📋 下一步操作："
echo ""
echo "1. 提交代码到 Git："
echo "   git add ."
echo "   git commit -m 'Prepare for Railway deployment'"
echo "   git push"
echo ""
echo "2. 在 Railway 创建项目："
echo "   https://railway.app"
echo ""
echo "3. 按照以下顺序创建服务："
echo "   a. PostgreSQL Database"
echo "   b. Agent Service (src/index.ts)"
echo "   c. API Service (src/api/server.ts)"
echo "   d. Worker Service (scripts/worker.ts)"
echo ""
echo "4. 配置环境变量（每个服务）："
echo "   DATABASE_URL=\${{Postgres.DATABASE_URL}}"
echo "   PRIVATE_KEY=你的私钥"
echo "   OPENAI_API_KEY=你的密钥"
echo "   TWITTER_COOKIES=[...]"
echo ""
echo "5. 运行数据库迁移："
echo "   railway run bun run scripts/migrate.ts"
echo ""
echo "📖 详细指南："
echo "   cat RAILWAY_DEPLOYMENT.md"
