const TelegramBot = require('node-telegram-bot-api');
const TwitterCatcher = require('./twitter_catcher');
const Handle = require('./handle');
const dotenv = require('dotenv');
dotenv.config();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

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
/query <用户名> - 查询用户监控状态
/list - 查看所有监控用户列表
/echo <消息> - 回复消息
/help - 显示帮助信息

💡 示例：
/add elonmusk
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
• /query <用户名> - 查询用户监控状态
• /list - 显示所有监控的用户
• /echo <消息> - 机器人回复你的消息
• /start - 显示欢迎信息
• /help - 显示此帮助信息

⚠️ 注意事项：
• 最多可监控 200 个用户
• 用户名不能重复添加
• 监控包括推文和回复

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
            message += `${index + 1}. @${task.user} - ${status}\n`;
        });
        
        message += `\n💡 使用 /query <用户名> 查看详细信息`;
        await bot.sendMessage(chatId, message);
        
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
        
        if (result.includes('found')) {
            await bot.sendMessage(chatId, `🔍 ${result}`);
        } else {
            await bot.sendMessage(chatId, `❌ ${result}`);
        }
    } catch (error) {
        await handleError(chatId, error, 'query user');
    }
});

// 处理未知命令
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // 忽略命令消息，因为它们已经被处理了
    if (text && text.startsWith('/')) {
        // 检查是否是未知命令
        const knownCommands = ['/start', '/help', '/add', '/del', '/list', '/query', '/echo'];
        const command = text.split(' ')[0];
        
        if (!knownCommands.includes(command)) {
            bot.sendMessage(chatId, `❌ 未知命令: ${command}\n\n使用 /help 查看可用命令列表`);
        }
    }
});

console.log('🚀 Twitter 监控机器人已启动！');