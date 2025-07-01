const TelegramBot = require('node-telegram-bot-api');
const TwitterCatcher = require('./twitter_catcher');
const Handle = require('./handle');
const dotenv = require('dotenv');
dotenv.config();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Markdown 特殊字符转义函数
function escapeMarkdown(text) {
    if (!text) return text;
    // 不转义反引号，因为我们需要它们来显示代码格式
    return text.toString().replace(/([_*[\]()~>#+=|{}.!-])/g, '\\$1');
}

// 初始化 TwitterCatcher 和 Handle
const catcher = new TwitterCatcher(process.env.TWITTER_CATCHER_API_KEY);
const handlers = new Map(); // 为每个 chatId 创建独立的 handler

// 获取或创建 handler 实例
function getHandler(chatId) {
    if (!handlers.has(chatId)) {
        handlers.set(chatId, new Handle(catcher, chatId));
    }
    return handlers.get(chatId);
}

// 错误处理函数
async function handleError(chatId, error, operation) {
    console.error(`Error in ${operation}:`, error);
    await bot.sendMessage(chatId, `❌ 操作失败: ${operation}\n错误信息: ${error.message || error}`);
}

bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"
  bot.sendMessage(chatId, resp);
});

// bot.on('message', (msg) => {
//   const chatId = msg.chat.id;
//   bot.sendMessage(chatId, 'Received your message');
// });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🎉 欢迎使用 Twitter 监控机器人！

📋 可用命令：
/add <用户名> - 添加 Twitter 用户监控
/del <用户名> - 删除 Twitter 用户监控
/addkey <用户名> <关键词> - 为用户添加监控关键词
/delkey <用户名> <关键词> - 为用户删除监控关键词
/query <用户名> - 查询用户监控状态
/list - 查看所有监控用户列表
/echo <消息> - 回复消息
/help - 显示帮助信息

💡 示例：
/add elonmusk
/addkey elonmusk ca, sale, presale, live, launch, tge
/delkey elonmusk ca, sale, presale
/query elonmusk
/del elonmusk
  `;
  bot.sendMessage(chatId, welcomeMessage);
});

// 添加帮助命令
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
📖 Twitter 监控机器人使用说明

🔧 命令列表：
• /add <用户名> - 添加用户到监控列表
• /del <用户名> - 从监控列表删除用户
• /addkey <用户名> <关键词> - 为用户添加监控关键词
• /delkey <用户名> <关键词> - 为用户删除监控关键词
• /query <用户名> - 查询用户监控状态
• /list - 显示所有监控的用户
• /echo <消息> - 机器人回复你的消息
• /start - 显示欢迎信息
• /help - 显示此帮助信息

⚠️ 注意事项：
• 最多可监控 200 个用户
• 用户名不能重复添加
• 监控包括推文和回复
• 关键词用逗号分隔，支持多个关键词
• 关键词仅限于正向过滤（推文中存在关键词才通知）

🚀 开始使用：发送 /add username 来添加第一个监控用户！
  `;
  bot.sendMessage(chatId, helpMessage);
});

// 添加用户命令
bot.onText(/\/add (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userName = match[1].trim();
    
    if (!userName) {
        await bot.sendMessage(chatId, '❌ 请提供用户名！\n用法: /add <用户名>');
        return;
    }

    try {
        await bot.sendMessage(chatId, `⏳ 正在添加用户 ${userName}...`);
        const handler = getHandler(chatId);
        const result = await handler.handle_add(userName);
        
        if (result.includes('successfully')) {
            await bot.sendMessage(chatId, `✅ ${result}`);
        } else {
            await bot.sendMessage(chatId, `⚠️ ${result}`);
        }
    } catch (error) {
        await handleError(chatId, error, 'add user');
    }
});

// 删除用户命令
bot.onText(/\/del (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userName = match[1].trim();
    
    if (!userName) {
        await bot.sendMessage(chatId, '❌ 请提供用户名！\n用法: /del <用户名>');
        return;
    }

    try {
        await bot.sendMessage(chatId, `⏳ 正在删除用户 ${userName}...`);
        const handler = getHandler(chatId);
        const result = await handler.handle_del(userName);
        
        if (result.includes('successfully')) {
            await bot.sendMessage(chatId, `✅ ${result}`);
        } else if (result.includes('not found')) {
            await bot.sendMessage(chatId, `❌ ${result}`);
        } else {
            await bot.sendMessage(chatId, `⚠️ ${result}`);
        }
    } catch (error) {
        await handleError(chatId, error, 'delete user');
    }
});

// 查看列表命令
bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;
    console.log('Fetching user list for chatId:', chatId);

    try {
        await bot.sendMessage(chatId, '⏳ 正在获取监控用户列表...');
        const handler = getHandler(chatId);
        const list = await handler.tc._list();
        
        if (!list || list.length === 0) {
            await bot.sendMessage(chatId, '📝 监控列表为空\n\n使用 /add <用户名> 来添加第一个用户！');
            return;
        }

        let message = `📋 监控用户列表 (${list.length}/200):\n\n`;
        
        list.forEach((task, index) => {
            const status = task.running == 0 ? '⏸️ 已停止' : '▶️ 运行中';
            // 对用户名进行转义，防止 Markdown 解析错误
            const escapedUser = escapeMarkdown(task.user);
            message += `${index + 1}. [@${escapedUser}](https://x.com/${task.user}) - ${status}\n`;
        });
        
        message += `\n💡 使用 /query <用户名> 查看详细信息`;
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        
    } catch (error) {
        await handleError(chatId, error, 'list users');
    }
});

// 查询用户命令
bot.onText(/\/query (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userName = match[1].trim();
    
    if (!userName) {
        await bot.sendMessage(chatId, '❌ 请提供用户名！\n用法: /query <用户名>');
        return;
    }

    try {
        await bot.sendMessage(chatId, `⏳ 正在查询用户 ${userName}...`);
        const handler = getHandler(chatId);
        const result = await handler.handle_query(userName);
        
        if (result.includes('已找到')) {
            // 对 result 中的特殊字符进行转义，防止 Telegram Markdown 解析错误
            const escapedResult = escapeMarkdown(result);
            await bot.sendMessage(chatId, `🔍 ${escapedResult}`, { parse_mode: 'Markdown' });
        } else {
            await bot.sendMessage(chatId, `❌ ${result}`);
        }
    } catch (error) {
        await handleError(chatId, error, 'query user');
    }
});

// 添加关键词命令
bot.onText(/\/addkey (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1].trim();
    
    // 找到第一个空格，分离用户名和关键词
    const firstSpaceIndex = input.indexOf(' ');
    if (firstSpaceIndex === -1) {
        await bot.sendMessage(chatId, '❌ 参数不足！\n用法: /addkey <用户名> <关键词1>, [关键词2], [关键词3] ...\n\n💡 示例: /addkey elonmusk ca, sale, presale, live, launch, tge');
        return;
    }

    const userName = input.substring(0, firstSpaceIndex).trim();
    const keywordsPart = input.substring(firstSpaceIndex + 1).trim();
    
    if (!keywordsPart) {
        await bot.sendMessage(chatId, '❌ 请提供关键词！\n用法: /addkey <用户名> <关键词1>, [关键词2], [关键词3] ...\n\n💡 示例: /addkey elonmusk ca, sale, presale, live, launch, tge');
        return;
    }

    // 将逗号分隔的关键词转换为后端格式
    const keywords = keywordsPart.split(',').map(k => k.trim()).join(',');
    
    try {
        await bot.sendMessage(chatId, `⏳ 正在为用户 ${userName} 添加关键词...`);
        const handler = getHandler(chatId);
        const result = await handler.handle_addKey(userName, keywords);
        
        // 对 result 中的特殊字符进行转义，防止 Telegram Markdown 解析错误
        const escapedResult = escapeMarkdown(result);
        await bot.sendMessage(chatId, escapedResult, { parse_mode: 'Markdown' });
    } catch (error) {
        await handleError(chatId, error, 'add keywords');
    }
});

// 删除关键词命令
bot.onText(/\/delkey (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1].trim();
    
    // 找到第一个空格，分离用户名和关键词
    const firstSpaceIndex = input.indexOf(' ');
    if (firstSpaceIndex === -1) {
        await bot.sendMessage(chatId, '❌ 参数不足！\n用法: /delkey <用户名> <关键词1>, [关键词2], [关键词3] ...\n\n💡 示例: /delkey elonmusk ca, sale, presale');
        return;
    }

    const userName = input.substring(0, firstSpaceIndex).trim();
    const keywordsPart = input.substring(firstSpaceIndex + 1).trim();
    
    if (!keywordsPart) {
        await bot.sendMessage(chatId, '❌ 请提供关键词！\n用法: /delkey <用户名> <关键词1>, [关键词2], [关键词3] ...\n\n💡 示例: /delkey elonmusk ca, sale, presale');
        return;
    }

    // 将逗号分隔的关键词转换为后端格式
    const keywords = keywordsPart.split(',').map(k => k.trim()).join(',');
    
    try {
        await bot.sendMessage(chatId, `⏳ 正在为用户 ${userName} 删除关键词...`);
        const handler = getHandler(chatId);
        const result = await handler.handle_delKey(userName, keywords);
        
        if (result.includes('成功')) {
            // 对 result 中的特殊字符进行转义，防止 Telegram Markdown 解析错误
            const escapedResult = escapeMarkdown(result);
            await bot.sendMessage(chatId, `✅ ${escapedResult}`, { parse_mode: 'Markdown' });
        } else if (result.includes('未找到')) {
            await bot.sendMessage(chatId, `❌ ${result}`);
        } else {
            await bot.sendMessage(chatId, `⚠️ 操作失败，请稍后重试`);
        }
    } catch (error) {
        await handleError(chatId, error, 'delete keywords');
    }
});

// 为所有用户添加关键词命令（不公开）
bot.onText(/\/addkeyall (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1].trim();
    
    // 将逗号空格分隔的格式转换为逗号分隔
    const keywords = input.split(',').map(k => k.trim()).join(',');
    
    // 只有特定用户可以使用此命令（可以根据需要修改权限检查）
    // const allowedUsers = [chatId]; // 可以添加允许的 chatId
    
    try {
        await bot.sendMessage(chatId, `⏳ 正在为所有用户添加关键词...`);
        const handler = getHandler(chatId);
        const result = await handler.handle_addKeyAll(keywords);
        
        if (result && result.success) {
            let message = `✅ 批量添加关键词完成！\n`;
            message += `📊 总用户数: ${result.total}\n`;
            // 对关键词进行转义，防止 Markdown 解析错误
            const escapedKeywords = escapeMarkdown(keywords);
            message += `🔔 关键词: \`${escapedKeywords}\`\n\n`;
            message += `📋 详细结果:\n`;
            result.results.forEach((res, index) => {
                // 对每条结果进行转义
                const escapedRes = escapeMarkdown(res);
                message += `${index + 1}. ${escapedRes}\n`;
            });
            
            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } else {
            await bot.sendMessage(chatId, `⚠️ 操作失败，请稍后重试`);
        }
    } catch (error) {
        await handleError(chatId, error, 'add keywords to all users');
    }
});

// 处理未知命令
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // 忽略命令消息，因为它们已经被处理了
    if (text && text.startsWith('/')) {
        // 检查是否是未知命令
        const knownCommands = ['/start', '/help', '/add', '/del', '/addkey', '/delkey', '/list', '/query', '/echo'];
        const command = text.split(' ')[0];
        
        if (!knownCommands.includes(command)) {
            bot.sendMessage(chatId, `❌ 未知命令: ${command}\n\n使用 /help 查看可用命令列表`);
        }
    }
});

console.log('🚀 Twitter 监控机器人已启动！');