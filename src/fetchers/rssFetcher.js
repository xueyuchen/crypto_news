/**
 * RSS 订阅源抓取模块
 * 并行抓取多个 RSS 源，提取标题、摘要、链接、发布时间
 */

import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: ['pubDate', 'dc:creator']
  }
});

/**
 * 从单个 RSS 源抓取新闻
 * @param {Object} source - RSS 源配置 { name, url }
 * @returns {Promise<Array>} 新闻数组
 */
async function fetchRSSFeed(source) {
  try {
    console.log(`正在抓取 RSS 源: ${source.name} (${source.url})`);
    
    const feed = await parser.parseURL(source.url);
    
    if (!feed.items || feed.items.length === 0) {
      console.log(`  ⚠️  ${source.name}: 未找到新闻条目`);
      return [];
    }

    const news = feed.items.map(item => ({
      title: item.title || '',
      description: item.contentSnippet || item.content || item.summary || '',
      url: item.link || item.guid || '',
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      source: source.name,
      type: 'rss'
    }));

    console.log(`  ✅ ${source.name}: 成功抓取 ${news.length} 条新闻`);
    return news;
  } catch (error) {
    console.error(`  ❌ ${source.name}: 抓取失败 - ${error.message}`);
    return [];
  }
}

/**
 * 并行抓取所有启用的 RSS 源
 * @param {Array} sources - RSS 源配置数组
 * @returns {Promise<Array>} 所有新闻的合并数组
 */
export async function fetchAllRSSFeeds(sources) {
  const enabledSources = sources.filter(s => s.enabled);
  
  if (enabledSources.length === 0) {
    console.log('没有启用的 RSS 源');
    return [];
  }

  console.log(`开始并行抓取 ${enabledSources.length} 个 RSS 源...`);
  
  const promises = enabledSources.map(source => fetchRSSFeed(source));
  const results = await Promise.allSettled(promises);
  
  const allNews = results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => result.value);
  
  console.log(`RSS 抓取完成，共获得 ${allNews.length} 条新闻`);
  return allNews;
}
