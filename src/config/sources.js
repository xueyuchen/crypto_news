/**
 * 新闻源配置
 * 集中管理所有 RSS 和网页爬取的新闻源
 */

export const newsSources = {
  rss: [
    {
      name: 'Federal Reserve Press Releases',
      url: 'https://www.federalreserve.gov/feeds/press_all.xml',
      enabled: true
    },
    {
      name: 'CoinDesk',
      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
      enabled: true
    },
    {
      name: 'Cointelegraph',
      url: 'https://cointelegraph.com/rss',
      enabled: true
    },
    {
      name: 'Reuters Business',
      url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best',
      enabled: true
    },
    {
      name: 'Bloomberg Markets',
      url: 'https://feeds.bloomberg.com/markets/news.rss',
      enabled: true
    }
  ],
  web: [
    {
      name: 'Federal Reserve Speeches',
      url: 'https://www.federalreserve.gov/newsevents/speeches.htm',
      enabled: false, // 需要时启用
      selector: '.eventlist-item'
    }
  ]
};
