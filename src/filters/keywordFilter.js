/**
 * 关键词预筛选模块
 * 使用关键词匹配进行初步筛选，只保留包含至少 2 个类别关键词的新闻
 */

// 关键词分类
const KEYWORDS = {
  crypto: [
    'crypto', 'cryptocurrency', 'bitcoin', 'btc', 'ethereum', 'eth',
    'blockchain', 'digital currency', 'stablecoin', 'defi', 'nft',
    'altcoin', 'token', 'wallet', 'exchange', 'mining', 'hash',
    'satoshi', 'hodl', 'fiat', 'crypto market', 'digital asset'
  ],
  fed: [
    'federal reserve', 'fed', 'fomc', 'interest rate', 'monetary policy',
    'powell', 'inflation', 'deflation', 'quantitative easing', 'qe',
    'tapering', 'rate hike', 'rate cut', 'federal funds rate',
    'central bank', 'jerome powell', 'fed chair'
  ],
  macro: [
    'gdp', 'unemployment', 'cpi', 'ppi', 'treasury', 'bond yield',
    'economic growth', 'recession', 'stagflation', 'fiscal policy',
    'government spending', 'debt ceiling', 'trade deficit', 'surplus',
    'employment', 'job market', 'consumer price', 'producer price',
    'economic indicator', 'macroeconomic'
  ]
};

/**
 * 检查文本中是否包含关键词
 * @param {string} text - 要检查的文本
 * @param {Array<string>} keywords - 关键词数组
 * @returns {boolean} 是否包含关键词
 */
function containsKeywords(text, keywords) {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * 统计文本中包含的类别数量
 * @param {string} title - 新闻标题
 * @param {string} description - 新闻描述
 * @returns {Object} 包含各类别匹配情况和总数
 */
function countCategoryMatches(title, description) {
  const combinedText = `${title} ${description}`;
  
  const matches = {
    crypto: containsKeywords(combinedText, KEYWORDS.crypto),
    fed: containsKeywords(combinedText, KEYWORDS.fed),
    macro: containsKeywords(combinedText, KEYWORDS.macro)
  };
  
  const categoryCount = Object.values(matches).filter(Boolean).length;
  
  return {
    ...matches,
    categoryCount
  };
}

/**
 * 关键词预筛选
 * 只保留包含至少 2 个类别关键词的新闻
 * @param {Array<Object>} news - 新闻数组
 * @returns {Array<Object>} 筛选后的新闻数组
 */
export function filterByKeywords(news) {
  console.log(`开始关键词预筛选，原始新闻数: ${news.length}`);
  
  const filtered = news.filter(item => {
    const matches = countCategoryMatches(item.title, item.description);
    
    // 至少包含 2 个类别的关键词
    if (matches.categoryCount >= 2) {
      item.keywordMatches = matches;
      return true;
    }
    
    return false;
  });
  
  console.log(`关键词筛选完成，保留新闻数: ${filtered.length}`);
  return filtered;
}
