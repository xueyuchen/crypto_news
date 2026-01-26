/**
 * 网页爬取模块
 * 使用 axios + cheerio 进行轻量级网页爬取
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * 从单个网页抓取新闻
 * @param {Object} source - 网页源配置 { name, url, selector }
 * @returns {Promise<Array>} 新闻数组
 */
async function scrapeWebPage(source) {
  try {
    console.log(`正在爬取网页: ${source.name} (${source.url})`);
    
    const response = await axios.get(source.url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const items = $(source.selector || 'article, .news-item, .post');
    
    if (items.length === 0) {
      console.log(`  ⚠️  ${source.name}: 未找到新闻条目`);
      return [];
    }

    const news = [];
    items.each((index, element) => {
      const $item = $(element);
      const title = $item.find('h1, h2, h3, .title, a').first().text().trim();
      const url = $item.find('a').first().attr('href') || '';
      const description = $item.find('.summary, .excerpt, p').first().text().trim();
      const dateText = $item.find('.date, time, .published').first().text().trim();
      
      if (title && url) {
        // 处理相对 URL
        const fullUrl = url.startsWith('http') ? url : new URL(url, source.url).href;
        
        news.push({
          title,
          description: description || '',
          url: fullUrl,
          publishedAt: parseDate(dateText) || new Date(),
          source: source.name,
          type: 'web'
        });
      }
    });

    console.log(`  ✅ ${source.name}: 成功爬取 ${news.length} 条新闻`);
    return news;
  } catch (error) {
    console.error(`  ❌ ${source.name}: 爬取失败 - ${error.message}`);
    return [];
  }
}

/**
 * 解析日期字符串
 * @param {string} dateText - 日期文本
 * @returns {Date|null} 解析后的日期
 */
function parseDate(dateText) {
  if (!dateText) return null;
  
  try {
    const date = new Date(dateText);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // 忽略解析错误
  }
  
  return null;
}

/**
 * 并行爬取所有启用的网页源
 * @param {Array} sources - 网页源配置数组
 * @returns {Promise<Array>} 所有新闻的合并数组
 */
export async function scrapeAllWebPages(sources) {
  const enabledSources = sources.filter(s => s.enabled);
  
  if (enabledSources.length === 0) {
    console.log('没有启用的网页源');
    return [];
  }

  console.log(`开始并行爬取 ${enabledSources.length} 个网页源...`);
  
  const promises = enabledSources.map(source => scrapeWebPage(source));
  const results = await Promise.allSettled(promises);
  
  const allNews = results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => result.value);
  
  console.log(`网页爬取完成，共获得 ${allNews.length} 条新闻`);
  return allNews;
}
