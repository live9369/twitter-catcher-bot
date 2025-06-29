const TwitterCatcher = require('./twitter_catcher');
const Handle = require('./handle');
const dotenv = require('dotenv');
dotenv.config();

const catcher = new TwitterCatcher(process.env.TWITTER_CATCHER_API_KEY);
const chatId = 123456789; // 替换为实际的 chatId
const handler = new Handle(catcher, chatId);

// 测试函数
async function runTests() {
    console.log('=== Starting Twitter Catcher Tests ===\n');

    try {
        // 测试1: 查询用户
        console.log('1. Testing handle_query...');
        const queryResult = await handler.handle_query('Live9369');
        console.log('Query result:', queryResult);
        console.log('');
 
        // 测试2: 添加用户
        console.log('2. Testing handle_add...');
        const addResult = await handler.handle_add('monkeyjiang');
        console.log('Add result:', addResult);
        console.log('');

        // 测试3: 再次查询刚添加的用户
        console.log('3. Testing handle_query for newly added user...');
        const queryNewUserResult = await handler.handle_query('monkeyjiang');
        console.log('Query new user result:', queryNewUserResult);
        console.log('');

        // 测试4: 尝试添加重复用户
        console.log('4. Testing handle_add with duplicate user...');
        const duplicateAddResult = await handler.handle_add('monkeyjiang');
        console.log('Duplicate add result:', duplicateAddResult);
        console.log('');

        // 测试5: 删除用户
        console.log('5. Testing handle_del...');
        const delResult = await handler.handle_del('monkeyjiang');
        console.log('Delete result:', delResult);
        console.log('');

        // 测试6: 尝试删除不存在的用户
        console.log('6. Testing handle_del with non-existent user...');
        const delNonExistentResult = await handler.handle_del('nonexistentuser');
        console.log('Delete non-existent user result:', delNonExistentResult);
        console.log('');

        // 测试7: 直接调用 TwitterCatcher 的 _list 方法
        console.log('7. Testing TwitterCatcher _list method...');
        const listResult = await catcher._list();
        console.log('List result:', JSON.stringify(listResult, null, 2));
        console.log('');

    } catch (error) {
        console.error('Test error:', error);
    }

    console.log('=== Tests Completed ===');
}

// 运行测试
runTests();


