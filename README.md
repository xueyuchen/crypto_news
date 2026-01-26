# 加密货币新闻自动推送工具

一个基于 GitHub Actions 和 Node.js 的自动化工具，每天早上 UTC 01:00（北京时间 09:00）自动收集美联储和宏观经济新闻，通过 AI 过滤和总结加密货币相关内容，并发送到 Telegram 频道。

## 功能特性

- 📰 **多源新闻抓取**: 支持 RSS 订阅和网页爬取
- 🔍 **智能筛选**: 关键词预筛选 + AI 智能过滤
- 📊 **Fed → Crypto 影响评分**: AI 评估美联储新闻对加密货币市场的影响（0~100 分）
- 🤖 **AI 总结**: 使用 OpenAI 生成中文摘要和市场影响分析
- 📱 **Telegram 推送**: 自动发送到 Telegram 频道，按影响评分排序
- 🔄 **去重机制**: 避免重复发送相同新闻
- ⏰ **定时执行**: GitHub Actions 每天自动运行

## 技术架构

```
GitHub Actions (定时触发)
    ↓
RSS/网页抓取 → 关键词筛选 → AI 过滤 → Fed→Crypto 影响评分 → 去重检查 → AI 总结 → Telegram 发送
```

### Fed → Crypto 影响评分模型

使用 AI 从四个维度评估美联储和宏观经济新闻对加密货币市场的影响：

1. **政策力度** (0-25分)：政策变化的幅度和直接性
2. **市场预期差** (0-25分)：与市场预期的偏离程度
3. **时间紧迫性** (0-25分)：影响的时间跨度
4. **加密市场相关性** (0-25分)：对加密货币的直接影响

**评分标准：**
- 🔴 80-100分：极高影响（可能导致市场剧烈波动 >5%）
- 🟠 60-79分：高影响（可能导致明显波动 3-5%）
- 🟡 40-59分：中等影响（可能导致波动 1-3%）
- 🟢 20-39分：低影响（可能导致小幅波动 <1%）
- ⚪ 0-19分：微弱影响（几乎不影响市场）

新闻按影响评分从高到低排序推送。

## 项目结构

```
.
├── .github/
│   └── workflows/
│       └── daily-news.yml      # GitHub Actions 工作流
├── src/
│   ├── config/
│   │   └── sources.js          # 新闻源配置
│   ├── fetchers/
│   │   ├── rssFetcher.js       # RSS 抓取模块
│   │   └── webScraper.js       # 网页爬取模块
│   ├── filters/
│   │   ├── keywordFilter.js    # 关键词预筛选
│   │   └── aiFilter.js         # AI 智能过滤
│   ├── processors/
│   │   ├── impactScorer.js     # Fed → Crypto 影响评分
│   │   └── aiSummarizer.js     # AI 内容总结
│   ├── utils/
│   │   └── deduplicator.js     # 去重逻辑
│   ├── telegram/
│   │   └── sender.js           # Telegram 发送
│   └── index.js                # 主入口文件
├── data/
│   └── sent_news.json          # 已发送新闻记录
├── package.json
├── .env.example
└── README.md
```

## 快速开始

### 1. 克隆或 Fork 此仓库

```bash
git clone <your-repo-url>
cd github_actions
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填写：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
OPENAI_API_KEY=your_openai_api_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
```

#### 获取 Telegram Bot Token

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 创建新 Bot
3. 按提示设置 Bot 名称和用户名
4. 获取 Token（格式：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`）

#### 获取 Telegram Chat ID

**对于频道（Channel）:**
1. 创建或选择一个 Telegram 频道
2. 将 Bot 添加为频道管理员
3. 发送一条消息到频道
4. 访问 `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
5. 在返回的 JSON 中找到 `chat.id`（格式：`-1001234567890`）

**对于群组（Group）:**
1. 将 Bot 添加到群组
2. 同样访问上述 API 获取 `chat.id`

### 4. 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

1. 进入仓库 Settings → Secrets and variables → Actions
2. 添加以下 Secrets：
   - `OPENAI_API_KEY`: OpenAI API 密钥
   - `TELEGRAM_BOT_TOKEN`: Telegram Bot Token
   - `TELEGRAM_CHAT_ID`: Telegram 频道/群组 ID

### 5. 本地测试

```bash
npm start
```

### 6. 启用 GitHub Actions

1. 确保仓库已启用 GitHub Actions
2. 工作流会在每天 UTC 01:00 自动运行
3. 也可以手动触发：Actions → Daily Crypto News → Run workflow

## 配置说明

### 新闻源配置

编辑 `src/config/sources.js` 可以添加或移除新闻源：

```javascript
export const newsSources = {
  rss: [
    {
      name: 'Federal Reserve Press Releases',
      url: 'https://www.federalreserve.gov/feeds/press_all.xml',
      enabled: true
    },
    // 添加更多 RSS 源...
  ],
  web: [
    {
      name: 'Federal Reserve Speeches',
      url: 'https://www.federalreserve.gov/newsevents/speeches.htm',
      enabled: false,
      selector: '.eventlist-item'
    },
    // 添加更多网页源...
  ]
};
```

### 关键词配置

编辑 `src/filters/keywordFilter.js` 可以调整关键词：

- `crypto`: 加密货币相关关键词
- `fed`: 美联储相关关键词
- `macro`: 宏观经济相关关键词

### AI 模型配置

默认使用 `gpt-4o-mini`（更经济）。可以在以下文件中修改：

- `src/filters/aiFilter.js`: AI 过滤使用的模型
- `src/processors/aiSummarizer.js`: AI 总结使用的模型

## 工作流程

1. **抓取新闻**: 并行抓取所有启用的 RSS 和网页源
2. **关键词筛选**: 保留包含至少 2 个类别关键词的新闻
3. **AI 过滤**: 使用 AI 判断相关性（评分 >= 6）
4. **Fed → Crypto 影响评分**: AI 评估对加密货币市场的影响程度（0~100 分）
5. **去重检查**: 过滤已发送过的新闻
6. **AI 总结**: 生成中文摘要和市场影响分析
7. **Telegram 发送**: 按影响评分从高到低发送到配置的频道/群组
8. **保存记录**: 更新已发送新闻记录

## 成本估算

- **GitHub Actions**: 免费（公开仓库）
- **OpenAI API**: 约 $0.01-0.05/天（取决于新闻数量）
- **Telegram**: 免费
- **总计**: 约 $0.30-1.50/月

## 故障排除

### 问题：GitHub Actions 运行失败

- 检查 Secrets 是否配置正确
- 查看 Actions 日志了解具体错误
- 确保仓库已启用 Actions

### 问题：Telegram 消息未发送

- 检查 Bot Token 和 Chat ID 是否正确
- 确保 Bot 已添加到频道/群组并具有发送权限
- 检查网络连接（GitHub Actions 可能需要访问 Telegram API）

### 问题：AI API 调用失败

- 检查 API Key 是否有效
- 检查账户余额是否充足
- 查看是否有 API 限流

### 问题：新闻重复发送

- 检查 `data/sent_news.json` 是否正确提交到仓库
- 确保 GitHub Actions 有写入权限

## 开发

### 添加新的新闻源

1. 在 `src/config/sources.js` 中添加配置
2. 如果是网页源，可能需要调整 `webScraper.js` 的选择器

### 添加新的推送渠道

1. 创建新的发送模块（如 `src/discord/sender.js`）
2. 在 `src/index.js` 中集成

### 自定义 AI Prompt

编辑以下文件中的 prompt：
- `src/filters/aiFilter.js`: 相关性判断 prompt
- `src/processors/aiSummarizer.js`: 总结 prompt

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
