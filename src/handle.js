class Handle {
    constructor(tc, chatId) {
        this.tc = tc;
        this.chatId = chatId;
    }

    // 将新关键词添加到现有正则表达式中
    _addkey(existingRegex, newKeywords) {
        if (!newKeywords || newKeywords.length === 0) {
            return existingRegex;
        }

        // 将新关键词转换为数组（如果是字符串的话）
        const keywordArray = Array.isArray(newKeywords) ? newKeywords : newKeywords.split(',').map(k => k.trim());
        
        // 过滤掉空关键词
        const validKeywords = keywordArray.filter(keyword => keyword && keyword.length > 0);
        
        if (validKeywords.length === 0) {
            return existingRegex;
        }

        // 转义特殊正则字符，但保留一些常见的符号
        const escapedKeywords = validKeywords.map(keyword => {
            return keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        });

        // 如果没有现有正则表达式，创建一个新的
        if (!existingRegex || existingRegex.trim() === '') {
            return `(?:${escapedKeywords.join('|')})`;
        }

        // 解析现有的正则表达式
        // 处理类似 "(?:sale|presale|live|launch|tge|ido|ifo|ieo|ico|come|coming|ca|contract|https?://)|0x[a-fA-F0-9]{40}" 的格式
        let baseRegex = existingRegex;
        
        // 检查是否有前导的(?:...)|部分
        const mainGroupMatch = baseRegex.match(/^\(\?\:([^)]+)\)/);
        if (mainGroupMatch) {
            // 提取现有关键词
            const existingKeywords = mainGroupMatch[1].split('|');
            
            // 合并并去重关键词
            const allKeywords = [...new Set([...existingKeywords, ...escapedKeywords])];
            
            // 重构正则表达式
            const newMainGroup = `(?:${allKeywords.join('|')})`;
            
            // 保留其他部分（如 |0x[a-fA-F0-9]{40}）
            const remainingPart = baseRegex.substring(mainGroupMatch[0].length);
            
            return newMainGroup + remainingPart;
        } else {
            // 如果格式不匹配，简单地在开头添加新关键词
            return `(?:${escapedKeywords.join('|')})|${baseRegex}`;
        }
    }

    // 从现有正则表达式中删除指定关键词
    _delkey(existingRegex, keywordsToRemove) {
        if (!keywordsToRemove || keywordsToRemove.length === 0) {
            return existingRegex;
        }

        // 将要删除的关键词转换为数组（如果是字符串的话）
        const keywordArray = Array.isArray(keywordsToRemove) ? keywordsToRemove : keywordsToRemove.split(',').map(k => k.trim());
        
        // 过滤掉空关键词
        const validKeywords = keywordArray.filter(keyword => keyword && keyword.length > 0);
        
        if (validKeywords.length === 0) {
            return existingRegex;
        }

        // 如果没有现有正则表达式，直接返回
        if (!existingRegex || existingRegex.trim() === '') {
            return existingRegex;
        }

        // 转义特殊正则字符，用于匹配
        const escapedKeywords = validKeywords.map(keyword => {
            return keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        });

        // 解析现有的正则表达式
        // 处理类似 "(?:sale|presale|live|launch|tge|ido|ifo|ieo|ico|come|coming|ca|contract|https?://)|0x[a-fA-F0-9]{40}" 的格式
        let baseRegex = existingRegex;
        
        // 检查是否有前导的(?:...)|部分
        const mainGroupMatch = baseRegex.match(/^\(\?\:([^)]+)\)/);
        if (mainGroupMatch) {
            // 提取现有关键词
            const existingKeywords = mainGroupMatch[1].split('|');
            
            // 过滤掉要删除的关键词
            const remainingKeywords = existingKeywords.filter(keyword => 
                !escapedKeywords.includes(keyword) && !validKeywords.includes(keyword)
            );
            
            // 如果没有剩余关键词，保留其他部分
            if (remainingKeywords.length === 0) {
                const remainingPart = baseRegex.substring(mainGroupMatch[0].length);
                // 如果剩余部分以|开头，去掉前导的|
                return remainingPart.startsWith('|') ? remainingPart.substring(1) : remainingPart;
            }
            
            // 重构正则表达式
            const newMainGroup = `(?:${remainingKeywords.join('|')})`;
            
            // 保留其他部分（如 |0x[a-fA-F0-9]{40}）
            const remainingPart = baseRegex.substring(mainGroupMatch[0].length);
            
            return newMainGroup + remainingPart;
        } else {
            // 如果格式不匹配，尝试简单的字符串替换
            let result = baseRegex;
            escapedKeywords.forEach(keyword => {
                // 删除 "keyword|" 或 "|keyword" 模式
                result = result.replace(new RegExp(`\\b${keyword}\\|`, 'g'), '');
                result = result.replace(new RegExp(`\\|${keyword}\\b`, 'g'), '');
                result = result.replace(new RegExp(`^${keyword}$`, 'g'), '');
            });
            
            // 清理可能的重复分隔符
            result = result.replace(/\|\|+/g, '|');
            result = result.replace(/^\|/, '');
            result = result.replace(/\|$/, '');
            
            return result;
        }
    }

    // 从正则表达式中提取关键词
    _extractKeywordsFromRegex(regex) {
        if (!regex || regex.trim() === '') {
            return '无';
        }

        // 处理类似 "(?:sale|presale|live|launch|tge|ido|ifo|ieo|ico|come|coming|ca|contract|https?://)|0x[a-fA-F0-9]{40}" 的格式
        const mainGroupMatch = regex.match(/^\(\?\:([^)]+)\)/);
        if (mainGroupMatch) {
            // 提取主要关键词组中的关键词
            const keywordsPart = mainGroupMatch[1];
            const keywords = keywordsPart.split('|').filter(keyword => {
                // 过滤掉复杂的正则表达式部分，但保留一些常见的URL模式
                return keyword && 
                       keyword.length > 0 &&
                       keyword.length < 30 && // 增加长度限制
                       // 排除包含复杂正则字符的，但保留简单的
                       !keyword.includes('[') && 
                       !keyword.includes('{') && 
                       !keyword.includes('\\') &&
                       // 但允许 ? 用于 https?:// 这样的模式
                       !(keyword.includes('?') && !keyword.includes('://'));
            });
            
            return keywords.length > 0 ? keywords.join(', ') : '无';
        }
        
        // 如果格式不匹配，尝试简单的分割
        const keywords = regex.split('|').filter(keyword => {
            return keyword && 
                   keyword.length > 0 &&
                   keyword.length < 30 &&
                   !keyword.includes('[') && 
                   !keyword.includes('{') && 
                   !keyword.includes('\\') &&
                   !keyword.includes('(') &&
                   !keyword.includes(')') &&
                   !(keyword.includes('?') && !keyword.includes('://'));
        });
        
        return keywords.length > 0 ? keywords.join(', ') : '无';
    }

    // 根据用户名查询
    async handle_query(userName) {
        // 请求列表
        const list = await this.tc._list();

        // 查找用户
        const user = list.find(task => task.user === userName);
        if (user) {
            const option = user.running == 0 ? '任务已停止' : '任务运行中';
            // 从正则表达式中提取关键词
            const regex = user.pingKeywords && user.pingKeywords.regex ? user.pingKeywords.regex : '';
            const keywords = this._extractKeywordsFromRegex(regex);
            
            // 如果关键词过长，分行显示
            let keywordDisplay;
            if (keywords.length > 50) {
                const keywordArray = keywords.split(', ');
                const chunks = [];
                let currentChunk = [];
                let currentLength = 0;
                
                for (const keyword of keywordArray) {
                    if (currentLength + keyword.length + 2 > 40) { // 每行最多40字符
                        if (currentChunk.length > 0) {
                            chunks.push(currentChunk.join(', '));
                            currentChunk = [keyword];
                            currentLength = keyword.length;
                        } else {
                            chunks.push(keyword);
                            currentLength = 0;
                        }
                    } else {
                        currentChunk.push(keyword);
                        currentLength += keyword.length + 2;
                    }
                }
                
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk.join(', '));
                }
                
                keywordDisplay = chunks.map(chunk => `\`${chunk}\``).join('\n');
            } else {
                keywordDisplay = `\`${keywords}\``;
            }
            
            return `用户 ${userName} 已找到，ID: ${user.id}，状态: ${option}\n🔔 监控关键词:\n\`${keywordDisplay}\n\``;
        } else {
            return `用户 ${userName} 未找到。`;
        }
    }

    async handle_add(userName){
        // 请求列表，列表长度小于200，列表user不能重复
        const list = await this.tc._list();

        if (list.length >= 200) {
            return "监控列表已满，无法添加更多用户。";
        }

        // 检查用户是否已存在
        const userExists = list.some(task => task.user === userName);
        if (userExists) {
            return `用户 ${userName} 已存在于监控列表中。`;
        }

        const taskData = {
            "user": userName,
            "options": [
                "posts",
                "replies"
            ],
            "pingKeywords": {
                "n": [],
                "p": [],
                "regex": "(?:sale|presale|live|launch|tge|ido|ifo|ieo|ico|come|coming|ca|contract|https?://)|0x[a-fA-F0-9]{40}",
                "isRegex": true
            },
            "useRegex": true,
            "ping": "role",
            "notification": "telegram",
            "chatId": this.chatId.toString(),
            "start": true
        }
        return this.tc._add(taskData)
            .then(result => {
                if (result && result.error == false) {
                    return `✅ 用户 ${userName} 添加成功。`;
                } else {
                    console.error("Failed to add user:", result);
                    return `❌ 用户 ${userName} 添加失败。`;
                }
            })
            .catch(error => {
                console.error("Error adding user:", error);
                throw error;
            });
    }

    // 删除用户
    async handle_del(userName) {
        // 请求列表
        const list = await this.tc._list();

        // 查找用户
        const user = list.find(task => task.user === userName);
        if (user) {
            return this.tc._del(user.id)
                .then(result => {
                    if (result && result.error == false) {
                        return `✅ 用户 ${userName} 删除成功。`;
                    } else {
                        console.error("Failed to delete user:", result);
                        return `❌ 用户 ${userName} 删除失败。`;
                    }
                })
                .catch(error => {
                    console.error("Error deleting user:", error);
                    throw error;
                });
        } else {
            return `用户 ${userName} 未找到。`;
        }
    }

    // 增加用户keywords
    async handle_addKey(userName, ping) {
        // 请求列表
        const list = await this.tc._list();

        // 查找用户
        const user = list.find(task => task.user === userName);
        if (user) {
            // 使用新的 _addkey 方法更新正则表达式
            const currentRegex = user.pingKeywords.regex || "";
            const updatedRegex = this._addkey(currentRegex, ping);
            
            // 编辑用户逻辑
            const taskData = {
                "id": user.id,
                "pingKeywords": {
                    "n": [],
                    "p": [],
                    "regex": updatedRegex,
                    "isRegex": true // 启用正则表达式模式
                },
                "useRegex": true
            }
            return this.tc._edit(taskData)
                .then(result => {
                    if (result && result.error == false) {
                        // 从更新后的正则表达式中提取关键词显示
                        const extractedKeywords = this._extractKeywordsFromRegex(updatedRegex);
                        return `✅ 用户 ${userName} 关键词添加成功。\n🔔 当前关键词: \`${extractedKeywords}\``;
                    } else {
                        console.error("Failed to edit user:", result);
                        return `❌ 用户 ${userName} 关键词添加失败。`;
                    }
                })
                .catch(error => {
                    console.error("Error editing user:", error);
                    throw error;
                });
        } else {
            return `用户 ${userName} 未找到。`;
        }
    }

    // 删除用户关键词
    async handle_delKey(userName, keywordsToRemove) {
        // 请求列表
        const list = await this.tc._list();

        // 查找用户
        const user = list.find(task => task.user === userName);
        if (user) {
            // 使用新的 _delkey 方法更新正则表达式
            const currentRegex = user.pingKeywords.regex || "";
            const updatedRegex = this._delkey(currentRegex, keywordsToRemove);
            
            // 同时也更新数组格式的关键词（为了兼容性）
            const removeKeywords = keywordsToRemove ? keywordsToRemove.split(',').map(item => item.trim()) : [];
            const existingKeywords = user.pingKeywords.p || [];
            const p = existingKeywords.filter(keyword => !removeKeywords.includes(keyword)); // 移除指定关键词
            
            const taskData = {
                "id": user.id,
                "pingKeywords": {
                    "n": [],
                    "p": p,
                    "regex": updatedRegex,
                }
            }
            return this.tc._edit(taskData)
                .then(result => {
                    if (result && result.error == false) {
                        // 从更新后的正则表达式中提取关键词显示
                        const extractedKeywords = this._extractKeywordsFromRegex(updatedRegex);
                        return `用户 ${userName} 关键词删除成功。\n🗑️ 已删除: \`${keywordsToRemove}\`\n🔔 剩余关键词: \`${extractedKeywords}\`\n📝 正则表达式已更新`;
                    } else {
                        console.error("Failed to delete keywords:", result);
                        return `用户 ${userName} 关键词删除失败。`;
                    }
                })
                .catch(error => {
                    console.error("Error deleting keywords:", error);
                    throw error;
                });
        } else {
            return `用户 ${userName} 未找到。`;
        }
    }

    // 为所有用户添加关键词
    async handle_addKeyAll(keywords) {
        // 请求列表
        const list = await this.tc._list();
        
        if (!list || list.length === 0) {
            return "监控列表中未找到用户。";
        }

        const newKeywords = keywords ? keywords.split(',').map(item => item.trim()) : [];
        const results = [];
        
        for (const user of list) {
            try {
                // 使用新的 _addkey 方法更新正则表达式
                const currentRegex = user.pingKeywords.regex || "";
                const updatedRegex = this._addkey(currentRegex, keywords);
                
                const taskData = {
                    "id": user.id,
                    "pingKeywords": {
                        "n": [],
                        "p": [],
                        "regex": updatedRegex,
                        "isRegex": true // 启用正则表达式模式
                    },
                    "useRegex": true
                }
                
                const result = await this.tc._edit(taskData);
                if (result && result.error == false) {
                    results.push(`✅ ${user.user}: 成功`);
                } else {
                    results.push(`❌ ${user.user}: 失败`);
                }
            } catch (error) {
                results.push(`❌ ${user.user}: 错误`);
                console.error(`Error updating user ${user.user}:`, error);
            }
        }
        
        return {
            success: true,
            total: list.length,
            results: results
        };
    }
}
module.exports = Handle; // 导出类