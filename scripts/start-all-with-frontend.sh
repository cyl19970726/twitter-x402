#!/bin/bash

# 启动所有服务（包括前端 Dashboard）

echo "🚀 启动 Twitter Space Platform 完整系统..."
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
check_port 3000 "Dashboard"

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
sleep 2

# 启动 API Server
echo "2️⃣ 启动 API Server 在端口 3001..."
bun run src/api/server.ts > logs/api.log 2>&1 &
API_PID=$!
echo "   PID: $API_PID"
sleep 2

# 启动 Worker
echo "3️⃣ 启动 Background Worker..."
bun run scripts/worker.ts > logs/worker.log 2>&1 &
WORKER_PID=$!
echo "   PID: $WORKER_PID"
sleep 2

# 启动前端 Dashboard
echo "4️⃣ 启动 Dashboard (前端) 在端口 3000..."
cd public && python3 -m http.server 3000 > ../logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
cd ..
echo "   PID: $DASHBOARD_PID"
sleep 2

echo ""
echo "✅ 所有服务已启动！"
echo ""
echo "📊 服务地址："
echo "   🔐 Agent (x402):   http://localhost:8787"
echo "   🔓 API Server:     http://localhost:3001"
echo "   🎨 Dashboard:      http://localhost:3000  ⬅️ 访问这个！"
echo "   ⚙️  Worker:         运行中（后台）"
echo ""
echo "📝 日志文件："
echo "   Agent:    logs/agent.log"
echo "   API:      logs/api.log"
echo "   Worker:   logs/worker.log"
echo "   Dashboard: logs/dashboard.log"
echo ""
echo "🧪 测试命令："
echo "   curl http://localhost:8787/.well-known/agent.json"
echo "   curl http://localhost:3001/health"
echo "   open http://localhost:3000  # 打开 Dashboard"
echo ""
echo "🛑 停止所有服务："
echo "   kill $AGENT_PID $API_PID $WORKER_PID $DASHBOARD_PID"
echo "   或运行: ./scripts/stop-all.sh"
echo ""

# 保存 PIDs
echo "$AGENT_PID" > logs/agent.pid
echo "$API_PID" > logs/api.pid
echo "$WORKER_PID" > logs/worker.pid
echo "$DASHBOARD_PID" > logs/dashboard.pid

# 等待用户中断
trap "echo ''; echo '🛑 停止所有服务...'; kill $AGENT_PID $API_PID $WORKER_PID $DASHBOARD_PID 2>/dev/null; rm -f logs/*.pid; echo '✅ 所有服务已停止'; exit 0" INT TERM

echo "⏳ 服务运行中... 按 Ctrl+C 停止"
echo "💡 打开浏览器访问: http://localhost:3000"
wait
