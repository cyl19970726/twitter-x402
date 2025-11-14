# Railway Procfile
# 注意: Railway 一个服务只能运行一个进程
# 需要创建 3 个不同的服务

# 服务 1: Agent (x402)
agent: bun run src/index.ts

# 服务 2: API Server
api: bun run src/api/server.ts

# 服务 3: Worker
worker: bun run scripts/worker.ts
