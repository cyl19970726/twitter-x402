#!/bin/bash

# 停止所有服务的脚本

echo "🛑 停止所有服务..."

# 读取保存的 PIDs
if [ -f logs/agent.pid ]; then
  AGENT_PID=$(cat logs/agent.pid)
  echo "停止 Agent (PID: $AGENT_PID)..."
  kill $AGENT_PID 2>/dev/null && echo "  ✅ Agent 已停止" || echo "  ⚠️  Agent 未运行"
  rm -f logs/agent.pid
fi

if [ -f logs/api.pid ]; then
  API_PID=$(cat logs/api.pid)
  echo "停止 API Server (PID: $API_PID)..."
  kill $API_PID 2>/dev/null && echo "  ✅ API Server 已停止" || echo "  ⚠️  API Server 未运行"
  rm -f logs/api.pid
fi

if [ -f logs/worker.pid ]; then
  WORKER_PID=$(cat logs/worker.pid)
  echo "停止 Worker (PID: $WORKER_PID)..."
  kill $WORKER_PID 2>/dev/null && echo "  ✅ Worker 已停止" || echo "  ⚠️  Worker 未运行"
  rm -f logs/worker.pid
fi

if [ -f logs/dashboard.pid ]; then
  DASHBOARD_PID=$(cat logs/dashboard.pid)
  echo "停止 Dashboard (PID: $DASHBOARD_PID)..."
  kill $DASHBOARD_PID 2>/dev/null && echo "  ✅ Dashboard 已停止" || echo "  ⚠️  Dashboard 未运行"
  rm -f logs/dashboard.pid
fi

# 额外清理：杀死所有相关进程
echo ""
echo "🧹 清理端口占用..."
lsof -ti:8787 | xargs kill -9 2>/dev/null && echo "  ✅ 端口 8787 已释放"
lsof -ti:3001 | xargs kill -9 2>/dev/null && echo "  ✅ 端口 3001 已释放"
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "  ✅ 端口 3000 已释放"

echo ""
echo "✅ 所有服务已停止"
