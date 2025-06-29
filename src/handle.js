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
        const option = user.running == 0 ? 'task stopped' : 'task running';
        if (user) {
            return `User ${userName} found, id: ${user.id}, ${option}`;
        } else {
            return `User ${userName} not found.`;
        }
    }

    async handle_add(userName){
        // 请求列表，列表长度小于200，列表user不能重复
        const list = await this.tc._list();

        if (list.length >= 200) {
            return "Task list is full, cannot add more users.";
        }

        // 检查用户是否已存在
        const userExists = list.some(task => task.user === userName);
        if (userExists) {
            return `User ${userName} already exists in the task list.`;
        }

        const taskData = {
            "user": userName,
            "options": [
                "posts",
                "replies"
            ],
            "notification": "telegram",
            "chatId": this.chatId,
            "start": true
        }
        return this.tc._add(taskData)
            .then(result => {
                if (result && result.error == false) {
                    return `User ${userName} added successfully.`;
                } else {
                    console.error("Failed to add user:", result);
                    return `Failed to add user ${userName}.`;
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
                        return `User ${userName} deleted successfully.`;
                    } else {
                        console.error("Failed to delete user:", result);
                        return `Failed to delete user ${userName}.`;
                    }
                })
                .catch(error => {
                    console.error("Error deleting user:", error);
                    throw error;
                });
        } else {
            return `User ${userName} not found.`;
        }
    }
}
module.exports = Handle; // 导出类