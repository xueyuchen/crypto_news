/**
 * 主入口文件
 * 编排整个新闻收集和推送流程
 */

import dotenv from 'dotenv';
import { newsSources } from './config/sources.js';
import { fetchAllRSSFeeds } from './fetchers/rssFetcher.js';
import { scrapeAllWebPages } from './fetchers/webScraper.js';
import { filterByKeywords } from './filters/keywordFilter.js';
import { filterByAI } from './filters/aiFilter.js';
import { scoreAllNewsImpact } from './processors/impactScorer.js';
import { summarizeAllNews } from './processors/aiSummarizer.js';
import { loadSentNews, filterUnsentNews, saveSentNews } from './utils/deduplicator.js';
import { sendNewsSummaries, sendSimpleMessage } from './telegram/sender.js';

// 加载环境变量
dotenv.config();

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始执行加密货币新闻收集和推送任务...\n');
  const startTime = Date.now();

  try {
    // 1. 抓取新闻
    console.log('='.repeat(50));
    console.log('步骤 1: 抓取新闻源');
    console.log('='.repeat(50));
    
    const [rssNews, webNews] = await Promise.all([
      fetchAllRSSFeeds(newsSources.rss),
      scrapeAllWebPages(newsSources.web)
    ]);
    
    const allNews = [...rssNews, ...webNews];
    console.log(`\n✅ 共抓取 ${allNews.length} 条新闻\n`);

    if (allNews.length === 0) {
      console.log('⚠️  未抓取到任何新闻，任务结束');
      await sendSimpleMessage('⚠️ 今日未抓取到任何新闻');
      return;
    }

    // 2. 关键词预筛选
    console.log('='.repeat(50));
    console.log('步骤 2: 关键词预筛选');
    console.log('='.repeat(50));
    
    const keywordFiltered = filterByKeywords(allNews);
    console.log(`\n✅ 关键词筛选后剩余 ${keywordFiltered.length} 条新闻\n`);

    if (keywordFiltered.length === 0) {
      console.log('⚠️  关键词筛选后无相关新闻，任务结束');
      await sendSimpleMessage('⚠️ 今日无相关新闻（关键词筛选）');
      return;
    }

    // 3. AI 智能过滤
    console.log('='.repeat(50));
    console.log('步骤 3: AI 智能过滤');
    console.log('='.repeat(50));
    
    const aiFiltered = await filterByAI(keywordFiltered);
    console.log(`\n✅ AI 过滤后剩余 ${aiFiltered.length} 条新闻\n`);

    if (aiFiltered.length === 0) {
      console.log('⚠️  AI 过滤后无相关新闻，任务结束');
      await sendSimpleMessage('⚠️ 今日无相关新闻（AI 过滤）');
      return;
    }

    // 4. Fed → Crypto 影响评分
    console.log('='.repeat(50));
    console.log('步骤 4: Fed → Crypto 影响评分');
    console.log('='.repeat(50));
    
    const scoredNews = await scoreAllNewsImpact(aiFiltered);
    console.log(`\n✅ 影响评分完成，已按评分排序\n`);

    // 5. 去重检查
    console.log('='.repeat(50));
    console.log('步骤 5: 去重检查');
    console.log('='.repeat(50));
    
    const { urls: sentUrls, records: existingRecords } = loadSentNews();
    const unsentNews = filterUnsentNews(scoredNews, sentUrls);
    console.log(`\n✅ 去重后剩余 ${unsentNews.length} 条未发送新闻\n`);

    if (unsentNews.length === 0) {
      console.log('⚠️  所有新闻都已发送过，任务结束');
      await sendSimpleMessage('✅ 今日无新新闻（所有新闻已发送过）');
      return;
    }

    // 6. AI 内容总结
    console.log('='.repeat(50));
    console.log('步骤 6: AI 内容总结');
    console.log('='.repeat(50));
    
    const summaries = await summarizeAllNews(unsentNews);
    console.log(`\n✅ 生成 ${summaries.length} 个摘要\n`);

    // 7. 发送到 Telegram
    console.log('='.repeat(50));
    console.log('步骤 7: 发送到 Telegram');
    console.log('='.repeat(50));
    
    const sentCount = await sendNewsSummaries(summaries);
    console.log(`\n✅ 成功发送 ${sentCount} 条新闻\n`);

    // 8. 保存已发送记录
    console.log('='.repeat(50));
    console.log('步骤 8: 保存已发送记录');
    console.log('='.repeat(50));
    
    saveSentNews(unsentNews, existingRecords);
    console.log('\n✅ 已保存发送记录\n');

    // 任务完成
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('='.repeat(50));
    console.log('✅ 任务完成！');
    console.log(`⏱️  总耗时: ${duration} 秒`);
    console.log(`📊 统计: 抓取 ${allNews.length} 条 → 关键词筛选 ${keywordFiltered.length} 条 → AI 过滤 ${aiFiltered.length} 条 → 影响评分 ${scoredNews.length} 条 → 去重 ${unsentNews.length} 条 → 发送 ${sentCount} 条`);
    console.log('='.repeat(50));
    process.exit(0);

  } catch (error) {
    console.error('\n❌ 任务执行失败:', error);
    console.error(error.stack);
    
    // 发送错误通知
    try {
      await sendSimpleMessage(`❌ 新闻收集任务失败:\n${error.message}`);
    } catch (sendError) {
      console.error('发送错误通知失败:', sendError);
    }
    
    process.exit(1);
  }
}

// 执行主函数
main();
