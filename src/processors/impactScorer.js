/**
 * Fed → Crypto 影响打分模型
 * 评估美联储和宏观经济新闻对加密货币市场的影响程度（0~100 分）
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
 * 评估新闻对加密货币市场的影响程度
 * @param {Object} newsItem - 新闻对象 { title, description, url }
 * @returns {Promise<Object>} { score: number(0-100), level: string, factors: Object }
 */
async function scoreImpact(newsItem) {
  try {
    const client = initOpenAI();
    
    const prompt = `请评估以下美联储/宏观经济新闻对加密货币市场的影响程度。

新闻标题：${newsItem.title}
新闻摘要：${newsItem.description || '无摘要'}

评估维度：
1. **政策力度** (0-25分)：政策变化的幅度和直接性
   - 利率决议、QE/QT 规模调整等重大政策 = 高分
   - 常规性发言、数据公布 = 中等分
   - 预期内的维持现状 = 低分

2. **市场预期差** (0-25分)：与市场预期的偏离程度
   - 超预期的鹰派/鸽派转向 = 高分
   - 符合预期 = 中等分
   - 已被充分定价 = 低分

3. **时间紧迫性** (0-25分)：影响的时间跨度
   - 立即生效的政策 = 高分
   - 近期（1-3个月）实施 = 中等分
   - 远期（>6个月）展望 = 低分

4. **加密市场相关性** (0-25分)：对加密货币的直接影响
   - 直接提及数字资产/加密货币 = 高分
   - 影响流动性、风险偏好 = 中等分
   - 间接宏观影响 = 低分

请以 JSON 格式返回：
{
  "policyStrength": 政策力度评分(0-25),
  "expectationGap": 市场预期差评分(0-25),
  "timeUrgency": 时间紧迫性评分(0-25),
  "cryptoRelevance": 加密市场相关性评分(0-25),
  "totalScore": 总分(0-100),
  "level": "极高影响" | "高影响" | "中等影响" | "低影响" | "微弱影响",
  "direction": "利好" | "利空" | "中性",
  "reasoning": "简短的评分理由（2-3句话）"
}

评分标准：
- 80-100分：极高影响（可能导致市场剧烈波动 >5%）
- 60-79分：高影响（可能导致明显波动 3-5%）
- 40-59分：中等影响（可能导致波动 1-3%）
- 20-39分：低影响（可能导致小幅波动 <1%）
- 0-19分：微弱影响（几乎不影响市场）

只返回 JSON，不要其他文字。`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '你是一个资深的加密货币市场分析师和美联储政策专家，擅长评估宏观经济事件对加密货币市场的影响。请基于历史数据和市场规律进行客观评估。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 400
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
      console.error(`JSON 解析失败，原始内容: ${content}`);
      // 如果解析失败，返回默认评分
      result = {
        policyStrength: 10,
        expectationGap: 10,
        timeUrgency: 10,
        cryptoRelevance: 10,
        totalScore: 40,
        level: '中等影响',
        direction: '中性',
        reasoning: 'AI 评分失败，使用默认值'
      };
    }

    // 验证和修正评分范围
    const validated = {
      policyStrength: Math.max(0, Math.min(25, result.policyStrength || 0)),
      expectationGap: Math.max(0, Math.min(25, result.expectationGap || 0)),
      timeUrgency: Math.max(0, Math.min(25, result.timeUrgency || 0)),
      cryptoRelevance: Math.max(0, Math.min(25, result.cryptoRelevance || 0)),
      totalScore: Math.max(0, Math.min(100, result.totalScore || 0)),
      level: result.level || '中等影响',
      direction: result.direction || '中性',
      reasoning: result.reasoning || '无理由说明'
    };

    return validated;
  } catch (error) {
    console.error(`影响评分失败 (${newsItem.title}): ${error.message}`);
    // 出错时返回默认评分
    return {
      policyStrength: 10,
      expectationGap: 10,
      timeUrgency: 10,
      cryptoRelevance: 10,
      totalScore: 40,
      level: '中等影响',
      direction: '中性',
      reasoning: `评分出错: ${error.message}`
    };
  }
}

/**
 * 批量评估新闻影响
 * @param {Array<Object>} news - 新闻数组
 * @returns {Promise<Array<Object>>} 带有影响评分的新闻数组
 */
export async function scoreAllNewsImpact(news) {
  if (news.length === 0) {
    return [];
  }

  console.log(`开始 Fed → Crypto 影响评分，待评分新闻数: ${news.length}`);
  
  // 逐个处理，避免并发过多
  for (let i = 0; i < news.length; i++) {
    const item = news[i];
    console.log(`  评分 ${i + 1}/${news.length}: ${item.title.substring(0, 50)}...`);
    
    try {
      const impact = await scoreImpact(item);
      item.impact = impact;
      
      // 显示评分结果
      const emoji = getImpactEmoji(impact.totalScore);
      const directionEmoji = getDirectionEmoji(impact.direction);
      console.log(`    ${emoji} 影响评分: ${impact.totalScore}/100 (${impact.level}) ${directionEmoji}${impact.direction}`);
    } catch (error) {
      console.error(`  评分失败: ${error.message}`);
      // 失败时使用默认评分
      item.impact = {
        policyStrength: 10,
        expectationGap: 10,
        timeUrgency: 10,
        cryptoRelevance: 10,
        totalScore: 40,
        level: '中等影响',
        direction: '中性',
        reasoning: `评分出错: ${error.message}`
      };
    }
    
    // 避免 API 限流
    if (i < news.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // 按影响评分从高到低排序
  news.sort((a, b) => (b.impact?.totalScore || 0) - (a.impact?.totalScore || 0));
  
  console.log(`影响评分完成，最高评分: ${news[0]?.impact?.totalScore || 0}，最低评分: ${news[news.length - 1]?.impact?.totalScore || 0}`);
  return news;
}

/**
 * 根据影响评分获取表情符号
 * @param {number} score - 影响评分
 * @returns {string} 表情符号
 */
function getImpactEmoji(score) {
  if (score >= 80) return '🔴'; // 极高影响
  if (score >= 60) return '🟠'; // 高影响
  if (score >= 40) return '🟡'; // 中等影响
  if (score >= 20) return '🟢'; // 低影响
  return '⚪'; // 微弱影响
}

/**
 * 根据影响方向获取表情符号
 * @param {string} direction - 影响方向
 * @returns {string} 表情符号
 */
function getDirectionEmoji(direction) {
  if (direction === '利好') return '📈';
  if (direction === '利空') return '📉';
  return '➡️';
}
