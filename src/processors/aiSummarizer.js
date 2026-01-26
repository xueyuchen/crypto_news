/**
 * AI 内容总结模块
 * 对筛选后的新闻进行总结，生成中文摘要并分析市场影响
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let openai = null;

/**
 * 初始化 OpenAI 客户端
 */
function initOpenAI() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 环境变量未设置');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

/**
 * 使用 AI 总结新闻内容
 * @param {Object} newsItem - 新闻对象 { title, description, url, publishedAt }
 * @returns {Promise<string>} 格式化后的中文摘要
 */
export async function summarizeNews(newsItem) {
  try {
    const client = initOpenAI();
    
    const prompt = `请对以下新闻进行总结和分析，重点关注：
1. 核心要点（3-5 句话的中文摘要）
2. 对加密货币市场的潜在影响分析

新闻标题：${newsItem.title}
新闻摘要：${newsItem.description || '无摘要'}
发布时间：${newsItem.publishedAt ? new Date(newsItem.publishedAt).toLocaleString('zh-CN') : '未知'}

请以以下 JSON 格式返回：
{
  "summary": "核心要点（3-5句话的中文摘要）",
  "marketImpact": "对加密货币市场的影响分析（2-3句话）"
}

只返回 JSON，不要其他文字。`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的金融新闻分析师，擅长总结新闻要点并分析对加密货币市场的影响。请用中文回答。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    const content = response.choices[0].message.content.trim();
    
    // 解析 JSON
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('未找到 JSON');
      }
    } catch (parseError) {
      // 如果解析失败，使用原始内容
      result = {
        summary: content.substring(0, 200) || '无法生成摘要',
        marketImpact: '无法分析市场影响'
      };
    }

    // 格式化输出
    const formattedDate = newsItem.publishedAt 
      ? new Date(newsItem.publishedAt).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '未知时间';

    return `📰 ${newsItem.title}
⏰ ${formattedDate}

🔍 核心要点：
${result.summary || '无摘要'}

💡 市场影响：
${result.marketImpact || '无影响分析'}

🔗 原文链接：${newsItem.url}`;
  } catch (error) {
    console.error(`AI 总结失败 (${newsItem.title}): ${error.message}`);
    
    // 出错时返回基本格式
    const formattedDate = newsItem.publishedAt 
      ? new Date(newsItem.publishedAt).toLocaleString('zh-CN')
      : '未知时间';
    
    return `📰 ${newsItem.title}
⏰ ${formattedDate}

🔍 核心要点：
${newsItem.description || '无摘要'}

💡 市场影响：
需要进一步分析

🔗 原文链接：${newsItem.url}`;
  }
}

/**
 * 批量总结新闻
 * @param {Array<Object>} news - 新闻数组
 * @returns {Promise<Array<string>>} 格式化后的摘要数组
 */
export async function summarizeAllNews(news) {
  if (news.length === 0) {
    return [];
  }

  console.log(`开始 AI 总结，待总结新闻数: ${news.length}`);
  
  const summaries = [];
  
  // 逐个处理，避免并发过多
  for (let i = 0; i < news.length; i++) {
    const item = news[i];
    console.log(`  总结 ${i + 1}/${news.length}: ${item.title.substring(0, 50)}...`);
    
    try {
      const summary = await summarizeNews(item);
      summaries.push(summary);
    } catch (error) {
      console.error(`  总结失败: ${error.message}`);
      // 失败时使用原始信息
      summaries.push(`📰 ${item.title}\n⏰ ${new Date(item.publishedAt).toLocaleString('zh-CN')}\n\n${item.description || '无摘要'}\n\n🔗 ${item.url}`);
    }
    
    // 避免 API 限流
    if (i < news.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`AI 总结完成，共生成 ${summaries.length} 个摘要`);
  return summaries;
}
