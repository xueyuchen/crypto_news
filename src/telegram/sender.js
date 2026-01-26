/**
 * Telegram Bot 消息发送模块
 * 支持 Markdown 格式，自动处理消息长度限制
 */

import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096; // Telegram 单条消息最大长度
const TELEGRAM_MAX_CAPTION_LENGTH = 1024; // Telegram 图片说明最大长度

let bot = null;

/**
 * 初始化 Telegram Bot
 */
function initBot() {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN 环境变量未设置');
    }
    if (!chatId) {
      throw new Error('TELEGRAM_CHAT_ID 环境变量未设置');
    }
    
    bot = new TelegramBot(token);
  }
  return bot;
}

/**
 * 发送单条消息（带重试机制）
 * @param {string} message - 消息内容
 * @param {number} retries - 重试次数
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendMessageWithRetry(message, retries = 3) {
  const bot = initBot();
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  for (let i = 0; i < retries; i++) {
    try {
      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });
      return true;
    } catch (error) {
      console.error(`发送消息失败 (尝试 ${i + 1}/${retries}): ${error.message}`);
      
      if (i < retries - 1) {
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
  
  return false;
}

/**
 * 分割长消息为多条
 * @param {string} message - 原始消息
 * @param {number} maxLength - 最大长度
 * @returns {Array<string>} 分割后的消息数组
 */
function splitMessage(message, maxLength = TELEGRAM_MAX_MESSAGE_LENGTH) {
  if (message.length <= maxLength) {
    return [message];
  }

  const messages = [];
  let currentMessage = '';
  
  // 按换行符分割，尽量保持段落完整
  const lines = message.split('\n');
  
  for (const line of lines) {
    if (currentMessage.length + line.length + 1 <= maxLength) {
      currentMessage += (currentMessage ? '\n' : '') + line;
    } else {
      if (currentMessage) {
        messages.push(currentMessage);
      }
      // 如果单行就超过长度，强制截断
      if (line.length > maxLength) {
        let remaining = line;
        while (remaining.length > maxLength) {
          messages.push(remaining.substring(0, maxLength));
          remaining = remaining.substring(maxLength);
        }
        currentMessage = remaining;
      } else {
        currentMessage = line;
      }
    }
  }
  
  if (currentMessage) {
    messages.push(currentMessage);
  }
  
  return messages;
}

/**
 * 发送多条新闻摘要
 * @param {Array<string>} summaries - 新闻摘要数组
 * @returns {Promise<number>} 成功发送的数量
 */
export async function sendNewsSummaries(summaries) {
  if (summaries.length === 0) {
    console.log('没有需要发送的新闻');
    return 0;
  }

  console.log(`开始发送 ${summaries.length} 条新闻到 Telegram...`);
  
  const bot = initBot();
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  // 如果只有一条新闻，直接发送
  if (summaries.length === 1) {
    const messages = splitMessage(summaries[0]);
    for (const msg of messages) {
      await sendMessageWithRetry(msg);
      // 消息间稍作延迟，避免触发限流
      if (messages.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    console.log('✅ 成功发送 1 条新闻');
    return 1;
  }

  // 多条新闻：尝试合并发送，如果太长则分开
  const separator = '\n\n' + '─'.repeat(30) + '\n\n';
  const combined = summaries.join(separator);
  
  if (combined.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
    // 可以合并发送
    const messages = splitMessage(combined);
    for (const msg of messages) {
      await sendMessageWithRetry(msg);
      if (messages.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    console.log(`✅ 成功发送 ${summaries.length} 条新闻（合并为 ${messages.length} 条消息）`);
    return summaries.length;
  } else {
    // 需要分开发送
    let successCount = 0;
    for (let i = 0; i < summaries.length; i++) {
      const summary = summaries[i];
      const header = `📊 今日新闻 (${i + 1}/${summaries.length})\n\n`;
      const fullMessage = header + summary;
      
      const messages = splitMessage(fullMessage);
      try {
        for (const msg of messages) {
          await sendMessageWithRetry(msg);
          if (messages.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        successCount++;
        
        // 消息间延迟，避免触发限流
        if (i < summaries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`发送第 ${i + 1} 条新闻失败: ${error.message}`);
      }
    }
    
    console.log(`✅ 成功发送 ${successCount}/${summaries.length} 条新闻`);
    return successCount;
  }
}

/**
 * 发送简单文本消息（用于测试或通知）
 * @param {string} message - 消息内容
 * @returns {Promise<boolean>} 是否发送成功
 */
export async function sendSimpleMessage(message) {
  try {
    const messages = splitMessage(message);
    for (const msg of messages) {
      await sendMessageWithRetry(msg);
      if (messages.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    return true;
  } catch (error) {
    console.error(`发送简单消息失败: ${error.message}`);
    return false;
  }
}
