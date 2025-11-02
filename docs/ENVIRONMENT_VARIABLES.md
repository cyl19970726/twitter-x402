# 环境变量配置说明

## 必填环境变量 (Required)

这些环境变量**必须设置**才能运行 Twitter Space Agent：

### 1. `OPENAI_API_KEY` ✅ **必填**
- **用途**: 调用 OpenAI Whisper API（转录）和 GPT-4o/GPT-4o-mini（格式化和总结）
- **格式**: `sk-proj-...` 或 `sk-...`
- **获取方式**: https://platform.openai.com/api-keys
- **示例**: `sk-proj-abc123xyz...`

### 2. `TWITTER_COOKIES` ✅ **必填**
- **用途**: 认证 Twitter API，绕过 Cloudflare 保护，下载 Space 音频
- **格式**: JSON 数组，包含 `auth_token` 和 `ct0` cookies
- **获取方式**: 参考 `docs/COOKIE_EXPORT_GUIDE.md`
- **示例**:
  ```json
  [
    {
      "key": "auth_token",
      "value": "YOUR_AUTH_TOKEN",
      "domain": ".twitter.com",
      "path": "/"
    },
    {
      "key": "ct0",
      "value": "YOUR_CT0_TOKEN",
      "domain": ".twitter.com",
      "path": "/"
    }
  ]
  ```

## 推荐配置的环境变量 (Recommended)

这些环境变量有默认值，但建议根据需求配置：

### x402 支付配置

#### 3. `NETWORK`
- **用途**: 支付网络标识符
- **默认值**: `base-sepolia`
- **可选值**: `base`, `base-sepolia`, `ethereum`, 等
- **示例**: `NETWORK=base-sepolia`

#### 4. `PAY_TO`
- **用途**: 接收 x402 支付的钱包地址
- **默认值**: `0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429`
- **格式**: 以 `0x` 开头的 EVM 地址
- **示例**: `PAY_TO=0xYourWalletAddress`

#### 5. `FACILITATOR_URL`
- **用途**: x402 facilitator 服务地址
- **默认值**: `https://facilitator.daydreams.systems`
- **示例**: `FACILITATOR_URL=https://facilitator.daydreams.systems`

### Per-entrypoint 定价配置

#### 6. `PRICE_FORMAT_SPACE`
- **用途**: `format-twitter-space` entrypoint 的价格
- **默认值**: `2000` (0.002 USDC)
- **单位**: 基本单位 (1 USDC = 1,000,000 base units)
- **示例**: `PRICE_FORMAT_SPACE=2000`

#### 7. `PRICE_SUMMARIZE_SPACE`
- **用途**: `summarize-twitter-space` entrypoint 的价格
- **默认值**: `1500` (0.0015 USDC)
- **单位**: 基本单位
- **示例**: `PRICE_SUMMARIZE_SPACE=1500`

#### 8. `PRICE_HEALTH`
- **用途**: `health` entrypoint 的价格
- **默认值**: `0` (免费)
- **单位**: 基本单位
- **示例**: `PRICE_HEALTH=0`

#### 9. `DEFAULT_PRICE`
- **用途**: 没有明确定价的 entrypoint 的默认价格
- **默认值**: `1000000` (1 USDC)
- **单位**: 基本单位
- **示例**: `DEFAULT_PRICE=1000000`

## 可选环境变量 (Optional)

### HTTP 服务配置

#### 10. `PORT`
- **用途**: 本地监听端口
- **默认值**: `8787`
- **示例**: `PORT=3000`

#### 11. `API_BASE_URL`
- **用途**: Agent manifest 中显示的基础 URL
- **默认值**: `http://localhost:8787`
- **示例**: `API_BASE_URL=https://your-domain.com`

### 高级功能（ERC-8004 Trust）

这些环境变量仅在启用 ERC-8004 身份注册时需要：

#### 12. `REGISTER_IDENTITY`
- **用途**: 是否启用 ERC-8004 身份注册
- **默认值**: `false`
- **可选值**: `true`, `false`
- **示例**: `REGISTER_IDENTITY=true`

#### 13. `AGENT_DOMAIN`
- **用途**: Agent 的域名（用于身份注册）
- **默认值**: 无
- **示例**: `AGENT_DOMAIN=twitter-space-agent.example.com`

#### 14. `CHAIN_ID`
- **用途**: 身份注册的链 ID
- **默认值**: `84532` (Base Sepolia)
- **示例**: `CHAIN_ID=84532`

#### 15. `IDENTITY_REGISTRY_ADDRESS`
- **用途**: ERC-8004 注册表合约地址
- **默认值**: 无
- **格式**: 以 `0x` 开头的 EVM 地址
- **示例**: `IDENTITY_REGISTRY_ADDRESS=0xRegistryAddress`

#### 16. `RPC_URL`
- **用途**: 用于 ERC-8004 交互的 RPC 端点
- **默认值**: 无
- **示例**: `RPC_URL=https://base-sepolia.infura.io/v3/YOUR_KEY`

#### 17. `PRIVATE_KEY`
- **用途**: 用于签署支付请求的钱包私钥
- **默认值**: 无
- **格式**: 以 `0x` 开头的私钥
- **⚠️ 警告**: 不要泄露此私钥！
- **示例**: `PRIVATE_KEY=0xYourPrivateKey`

## 配置检查清单

### 最小配置（仅本地测试）

```bash
# ✅ 必填
OPENAI_API_KEY=sk-proj-...
TWITTER_COOKIES=[...]

# ✅ 推荐（使用默认值即可）
NETWORK=base-sepolia
PRICE_FORMAT_SPACE=2000
PRICE_SUMMARIZE_SPACE=1500
PRICE_HEALTH=0
```

### 完整配置（生产环境）

```bash
# ✅ 必填
OPENAI_API_KEY=sk-proj-...
TWITTER_COOKIES=[...]

# ✅ x402 支付
NETWORK=base
PAY_TO=0xYourWalletAddress
FACILITATOR_URL=https://facilitator.daydreams.systems
DEFAULT_PRICE=1000000

# ✅ Per-entrypoint 定价
PRICE_FORMAT_SPACE=2000
PRICE_SUMMARIZE_SPACE=1500
PRICE_HEALTH=0

# ✅ HTTP 配置
PORT=8787
API_BASE_URL=https://your-domain.com

# ⚠️ 可选：ERC-8004（高级功能）
REGISTER_IDENTITY=true
AGENT_DOMAIN=your-agent.example.com
CHAIN_ID=8453
IDENTITY_REGISTRY_ADDRESS=0x...
RPC_URL=https://mainnet.base.org
PRIVATE_KEY=0x...
```

## 价格计算说明

**基本单位转换**：
- 1 USDC = 1,000,000 base units
- 0.001 USDC = 1,000 base units
- 0.002 USDC = 2,000 base units

**示例**：
```bash
# 免费
PRICE_HEALTH=0

# 0.001 USDC
PRICE_SMALL=1000

# 0.002 USDC
PRICE_FORMAT_SPACE=2000

# 0.0015 USDC
PRICE_SUMMARIZE_SPACE=1500

# 1 USDC
DEFAULT_PRICE=1000000
```

## 安全建议

1. **不要提交 `.env` 到 Git**
   - 已在 `.gitignore` 中配置
   - 使用 `.env.example` 作为模板

2. **保护敏感信息**
   - `OPENAI_API_KEY` - 限制使用量，定期轮换
   - `TWITTER_COOKIES` - 定期更新（cookies 会过期）
   - `PRIVATE_KEY` - 永不分享，使用专用钱包

3. **生产环境**
   - 使用环境变量管理服务（如 AWS Secrets Manager）
   - 限制 API key 权限
   - 监控使用量和成本

## 验证配置

运行测试验证配置是否正确：

```bash
# 测试定价配置
bun run tests/testPricing.ts

# 测试 Twitter 认证
bun run tests/testAuth.ts

# 测试完整服务
bun run src/index.ts
```

## 常见问题

### Q: OPENAI_API_KEY 提示无效？
A: 检查 API key 格式，确保以 `sk-` 或 `sk-proj-` 开头。

### Q: TWITTER_COOKIES 过期了？
A: 重新导出 cookies，参考 `docs/COOKIE_EXPORT_GUIDE.md`。

### Q: 定价单位搞不清楚？
A: 记住：1 USDC = 1,000,000 base units。例如 0.002 USDC = 2000 base units。

### Q: 需要 PRIVATE_KEY 吗？
A: 如果只是本地测试，不需要。如果要接收真实支付，需要提供钱包私钥。

## 更多信息

- [Cookie 导出指南](./COOKIE_EXPORT_GUIDE.md)
- [使用指南](./USAGE_GUIDE.md)
- [Agent 改进说明](./AGENT_IMPROVEMENTS.md)
