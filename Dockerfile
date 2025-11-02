# 使用官方 Bun 镜像
FROM oven/bun:1 AS base
WORKDIR /app

# 安装依赖
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# 复制生产依赖和源代码
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

# 暴露端口
EXPOSE 8787

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8787

# 启动命令
USER bun
ENTRYPOINT ["bun", "run", "src/index.ts"]
