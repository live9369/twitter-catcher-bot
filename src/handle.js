class Handle {
    constructor(tc, chatId) {
        this.tc = tc;
        this.chatId = chatId;
    }

    // 根据用户名查询
    async handle_query(userName) {
        // 请求列表
        const list = await this.tc._list();

        // 查找用户
        const user = list.find(task => task.user === userName);
        const option = user.running == 0 ? '任务已停止' : '任务运行中';
        if (user) {
            return `用户 ${userName} 已找到，ID: ${user.id}，状态: ${option}\n🔔 监控关键词: \`${user.pingKeywords.p.join(', ')}\`\n`;
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
                "p": ["sale", "presale", "live", "launch", "tge", "ido", "ifo", "ieo", "ico", "come", "coming", "ca", "contract", "http", "https"],
                "regex": "",
                "isRegex": false
            },
            "notification": "telegram",
            "chatId": this.chatId,
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
    async handle_addKey(userName, ping, regex = "", isRegex = false) {
        // 请求列表
        const list = await this.tc._list();

        // 查找用户
        const user = list.find(task => task.user === userName);
        if (user) {
            const newKeywords = ping ? ping.split(',').map(item => item.trim()) : [];
            const existingKeywords = user.pingKeywords.p || [];
            const p = [...new Set([...existingKeywords, ...newKeywords])]; // 合并并去重
            // 编辑用户逻辑
            const taskData = {
                "id": user.id,
                "pingKeywords": {
                    "n": [],
                    "p": p,
                    "regex": regex,
                    "isRegex": isRegex
                }
            }
            return this.tc._edit(taskData)
                .then(result => {
                    if (result && result.error == false) {
                        return `✅ 用户 ${userName} 关键词添加成功。\n🔔 当前关键词: \`${p.join(', ')}\``;
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
            const removeKeywords = keywordsToRemove ? keywordsToRemove.split(',').map(item => item.trim()) : [];
            const existingKeywords = user.pingKeywords.p || [];
            const p = existingKeywords.filter(keyword => !removeKeywords.includes(keyword)); // 移除指定关键词
            
            const taskData = {
                "id": user.id,
                "pingKeywords": {
                    "n": [],
                    "p": p,
                    "regex": user.pingKeywords.regex || "",
                    "isRegex": user.pingKeywords.isRegex || false
                }
            }
            return this.tc._edit(taskData)
                .then(result => {
                    if (result && result.error == false) {
                        return `用户 ${userName} 关键词删除成功。\n🗑️ 已删除: \`${keywordsToRemove}\`\n🔔 剩余关键词: \`${p.join(', ')}\``;
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
                const existingKeywords = user.pingKeywords.p || [];
                const p = [...new Set([...existingKeywords, ...newKeywords])]; // 合并并去重
                
                const taskData = {
                    "id": user.id,
                    "pingKeywords": {
                        "n": [],
                        "p": p,
                        "regex": user.pingKeywords.regex || "",
                        "isRegex": user.pingKeywords.isRegex || false
                    }
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