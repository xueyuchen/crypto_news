/**
 * AI 智能过滤模块
 * 使用 OpenAI API 判断新闻是否与"加密货币 + 宏观经济/美联储"相关
 * 返回相关性评分（0-10），只保留评分 >= 6 的新闻
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
 * 使用 AI 判断新闻相关性
 * @param {Object} newsItem - 新闻对象 { title, description, url }
 * @returns {Promise<Object>} { score: number, reason: string, relevant: boolean }
 */
async function judgeRelevance(newsItem) {
  try {
    const client = initOpenAI();
    
    const prompt = `请判断以下新闻是否与"加密货币市场和美联储/宏观经济政策"相关。

标题：${newsItem.title}
摘要：${newsItem.description || '无摘要'}

请从以下角度判断：
1. 是否直接涉及加密货币市场（比特币、以太坊等）
2. 是否涉及美联储政策（利率、货币政策等）
3. 是否涉及宏观经济指标（GDP、CPI、失业率等）
4. 这些因素是否可能影响加密货币市场

请以 JSON 格式返回：
{
  "score": 0-10 的相关性评分（10 为最相关），
  "reason": "简短的理由说明",
  "relevant": true/false（评分 >= 6 为 true）
}

只返回 JSON，不要其他文字。`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', // 使用更经济的模型
      messages: [
        {
          role: 'system',
          content: '你是一个专业的金融新闻分析助手，擅长判断新闻与加密货币市场的相关性。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = response.choices[0].message.content.trim();
    
    // 尝试提取 JSON
    let result;
    try {
      // 移除可能的 markdown 代码块标记
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('未找到 JSON');
      }
    } catch (parseError) {
      // 如果解析失败，尝试从文本中提取数字
      const scoreMatch = content.match(/["']?score["']?\s*[:=]\s*(\d+(?:\.\d+)?)/i);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5;
      result = {
        score,
        reason: 'AI 返回格式异常，使用默认评分',
        relevant: score >= 6
      };
    }

    return {
      score: result.score || 0,
      reason: result.reason || '无理由',
      relevant: result.relevant !== undefined ? result.relevant : (result.score >= 6)
    };
  } catch (error) {
    console.error(`AI 过滤失败 (${newsItem.title}): ${error.message}`);
    // 出错时默认保留（避免误删重要新闻）
    return {
      score: 5,
      reason: `AI 判断出错: ${error.message}`,
      relevant: true
    };
  }
}

/**
 * 批量使用 AI 过滤新闻
 * @param {Array<Object>} news - 新闻数组
 * @returns {Promise<Array<Object>} 过滤后的新闻数组（评分 >= 6）
 */
export async function filterByAI(news) {
  if (news.length === 0) {
    return [];
  }

  console.log(`开始 AI 智能过滤，待过滤新闻数: ${news.length}`);
  
  // 批量处理，但避免并发过多导致 API 限流
  const batchSize = 5;
  const filtered = [];
  
  for (let i = 0; i < news.length; i += batchSize) {
    const batch = news.slice(i, i + batchSize);
    console.log(`  处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(news.length / batchSize)}`);
    
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const judgment = await judgeRelevance(item);
        return { item, judgment };
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { item, judgment } = result.value;
        item.aiScore = judgment.score;
        item.aiReason = judgment.reason;
        
        if (judgment.relevant) {
          filtered.push(item);
          console.log(`    ✅ ${item.title.substring(0, 50)}... (评分: ${judgment.score})`);
        } else {
          console.log(`    ❌ ${item.title.substring(0, 50)}... (评分: ${judgment.score})`);
        }
      } else {
        console.error(`    ⚠️  处理失败: ${result.reason}`);
        // 失败时默认保留
        filtered.push(result.item || batch[results.indexOf(result)]);
      }
    }
    
    // 避免 API 限流，批次间稍作延迟
    if (i + batchSize < news.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`AI 过滤完成，保留新闻数: ${filtered.length}`);
  return filtered;
}
