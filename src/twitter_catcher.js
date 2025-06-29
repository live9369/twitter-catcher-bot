// 使用 Node.js 18+ 原生 fetch API

class TwitterCatcher {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.myHeaders = new Headers();
        this.myHeaders.append("Authorization", this.apiKey);
        this.myHeaders.append("Content-Type", "application/json");
        this.baseUrl = "https://monitor-api.tweet-catcher.com/pro";
    }

    // 通用 API 请求方法
    async _request(url, method = "GET", body = null) {
        const requestOptions = {
        method: method,
        headers: this.myHeaders,
        body: body ? JSON.stringify(body) : null,
        // redirect: "follow"
        };

        try {
            const response = await fetch(url, requestOptions);
            const result_1 = await response.json();
            return result_1;
        } catch (error) {
            console.error(error);
            throw error; // 如果有错误，抛出以便调用者处理
        }
    }

    // 封装的任务列表获取方法
    _list() {
        const url = this.baseUrl + "/tasks-list";
        return this._request(url);
    }

    // 封装的任务添加方法
    _add(taskData) {
        const url = this.baseUrl + "/add-task";
        return this._request(url, "POST", taskData);
    }

    // 封装的任务删除方法
    _del(taskId) {
        const url = this.baseUrl + "/delete-task";
        const body = { id: taskId };
        return this._request(url, "POST", body);
    }
}

module.exports = TwitterCatcher;  // 导出类
