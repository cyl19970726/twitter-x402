#!/bin/bash

# 启动所有服务的脚本

echo "🚀 启动 Twitter Space Platform 所有服务..."
echo ""

# 检查端口是否被占用
check_port() {
  local port=$1
  local service=$2
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  警告: 端口 $port 已被占用 ($service)"
    echo "   运行 'lsof -ti:$port | xargs kill' 关闭占用进程"
    return 1
  fi
  return 0
}

echo "📡 检查端口..."
check_port 8787 "Agent"
check_port 3001 "API Server"

echo ""
echo "✅ 端口检查完成"
echo ""
echo "📝 启动服务（按 Ctrl+C 停止所有服务）..."
echo ""

# 创建日志目录
mkdir -p logs

# 启动 Agent
echo "1️⃣ 启动 Agent (x402) 在端口 8787..."
bun run src/index.ts > logs/agent.log 2>&1 &
AGENT_PID=$!
echo "   PID: $AGENT_PID"

# 等待 Agent 启动
sleep 2

# 启动 API Server
echo "2️⃣ 启动 API Server 在端口 3001..."
bun run src/api/server.ts > logs/api.log 2>&1 &
API_PID=$!
echo "   PID: $API_PID"

# 等待 API Server 启动
sleep 2

# 启动 Worker
echo "3️⃣ 启动 Background Worker..."
bun run scripts/worker.ts > logs/worker.log 2>&1 &
WORKER_PID=$!
echo "   PID: $WORKER_PID"

# 等待所有服务启动
sleep 2

echo ""
echo "✅ 所有服务已启动！"
echo ""
echo "📊 服务状态："
echo "   Agent:  http://localhost:8787 (PID: $AGENT_PID)"
echo "   API:    http://localhost:3001 (PID: $API_PID)"
echo "   Worker: 运行中 (PID: $WORKER_PID)"
echo ""
echo "📝 日志文件："
echo "   Agent:  logs/agent.log"
echo "   API:    logs/api.log"
echo "   Worker: logs/worker.log"
echo ""
echo "🧪 测试命令："
echo "   curl http://localhost:8787/.well-known/agent.json"
echo "   curl http://localhost:3001/health"
echo ""
echo "🛑 停止所有服务："
echo "   kill $AGENT_PID $API_PID $WORKER_PID"
echo "   或运行: ./scripts/stop-all.sh"
echo ""
echo "📖 查看日志："
echo "   tail -f logs/agent.log"
echo "   tail -f logs/api.log"
echo "   tail -f logs/worker.log"
echo ""

# 保存 PIDs 到文件
echo "$AGENT_PID" > logs/agent.pid
echo "$API_PID" > logs/api.pid
echo "$WORKER_PID" > logs/worker.pid

# 等待用户中断
trap "echo ''; echo '🛑 停止所有服务...'; kill $AGENT_PID $API_PID $WORKER_PID 2>/dev/null; rm -f logs/*.pid; echo '✅ 所有服务已停止'; exit 0" INT TERM

echo "⏳ 服务运行中... 按 Ctrl+C 停止"
wait
