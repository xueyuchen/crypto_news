/**
 * 去重机制
 * 防止重复发送新闻，使用 JSON 文件存储已发送的新闻 URL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SENT_NEWS_FILE = path.join(__dirname, '../../data/sent_news.json');
const MAX_AGE_DAYS = 30; // 保留 30 天的记录

/**
 * 加载已发送的新闻记录
 * @returns {Object} { urls: Set, records: Array }
 */
export function loadSentNews() {
  try {
    if (!fs.existsSync(SENT_NEWS_FILE)) {
      // 如果文件不存在，创建目录和空文件
      const dir = path.dirname(SENT_NEWS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(SENT_NEWS_FILE, JSON.stringify({ records: [] }, null, 2));
      return { urls: new Set(), records: [] };
    }

    const data = JSON.parse(fs.readFileSync(SENT_NEWS_FILE, 'utf-8'));
    const records = data.records || [];
    
    // 清理过期记录（超过 30 天）
    const now = Date.now();
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const validRecords = records.filter(record => {
      const recordTime = new Date(record.sentAt).getTime();
      return (now - recordTime) < maxAge;
    });

    const urls = new Set(validRecords.map(r => r.url));
    
    return { urls, records: validRecords };
  } catch (error) {
    console.error(`加载已发送新闻记录失败: ${error.message}`);
    return { urls: new Set(), records: [] };
  }
}

/**
 * 检查新闻是否已发送过
 * @param {string} url - 新闻 URL
 * @param {Set<string>} sentUrls - 已发送 URL 集合
 * @returns {boolean} 是否已发送
 */
export function isNewsSent(url, sentUrls) {
  return sentUrls.has(url);
}

/**
 * 过滤未发送的新闻
 * @param {Array<Object>} news - 新闻数组
 * @param {Set<string>} sentUrls - 已发送 URL 集合
 * @returns {Array<Object>} 未发送的新闻数组
 */
export function filterUnsentNews(news, sentUrls) {
  const unsent = news.filter(item => !isNewsSent(item.url, sentUrls));
  console.log(`去重检查: ${news.length} 条新闻中，${unsent.length} 条未发送过`);
  return unsent;
}

/**
 * 保存已发送的新闻记录
 * @param {Array<Object>} news - 新发送的新闻数组
 * @param {Array<Object>} existingRecords - 现有记录
 */
export function saveSentNews(news, existingRecords) {
  try {
    const newRecords = news.map(item => ({
      url: item.url,
      title: item.title,
      sentAt: new Date().toISOString()
    }));

    const allRecords = [...existingRecords, ...newRecords];
    
    // 再次清理过期记录
    const now = Date.now();
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const validRecords = allRecords.filter(record => {
      const recordTime = new Date(record.sentAt).getTime();
      return (now - recordTime) < maxAge;
    });

    const data = {
      records: validRecords,
      lastUpdated: new Date().toISOString()
    };

    // 确保目录存在
    const dir = path.dirname(SENT_NEWS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(SENT_NEWS_FILE, JSON.stringify(data, null, 2));
    console.log(`已保存 ${newRecords.length} 条新发送记录，总计 ${validRecords.length} 条记录`);
  } catch (error) {
    console.error(`保存已发送新闻记录失败: ${error.message}`);
    throw error;
  }
}
