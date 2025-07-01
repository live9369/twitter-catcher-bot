const regex = new RegExp("(?:sale|presale|live|launch|tge|ido|ifo|ieo|ico|come|coming|ca|contract|https?://)|0x[a-fA-F0-9]{40}")

const text = `
launch for test
`;

const result = regex.test(text)

console.log(result);

// 测试 _addkey 方法
const Handle = require('./handle');

// 创建一个测试实例（使用空的 tc 和 chatId）
const handle = new Handle(null, 'test');

// 测试用例1：向现有正则表达式添加新关键词
const existingRegex = "(?:sale|presale|live|launch|tge|ido|ifo|ieo|ico|come|coming|ca|contract|https?://)|0x[a-fA-F0-9]{40}";
const newKeywords = "pump,moon,gem";

console.log("\n=== 测试 _addkey 方法 ===");
console.log("原始正则表达式:", existingRegex);
console.log("新增关键词:", newKeywords);

const updatedRegex = handle._addkey(existingRegex, newKeywords);
console.log("更新后的正则表达式:", updatedRegex);

// 测试新正则表达式是否工作
const newRegexTest = new RegExp(updatedRegex);
console.log("\n=== 测试新正则表达式 ===");
console.log("测试 'pump' :", newRegexTest.test("pump"));
console.log("测试 'moon' :", newRegexTest.test("moon"));
console.log("测试 'launch' :", newRegexTest.test("launch")); // 原有关键词
console.log("测试 'random' :", newRegexTest.test("random")); // 不匹配的词

// 测试用例2：添加数组格式的关键词
console.log("\n=== 测试数组格式关键词 ===");
const arrayKeywords = ["rocket", "bull", "bear"];
const updatedRegex2 = handle._addkey(existingRegex, arrayKeywords);
console.log("使用数组关键词更新后:", updatedRegex2);

// 测试用例3：空正则表达式
console.log("\n=== 测试空正则表达式 ===");
const emptyRegex = "";
const updatedRegex3 = handle._addkey(emptyRegex, "test,demo");
console.log("从空正则开始:", updatedRegex3);

// 测试 _delkey 方法
console.log("\n=== 测试 _delkey 方法 ===");
const fullRegex = "(?:sale|presale|live|launch|tge|ido|ifo|ieo|ico|come|coming|ca|contract|https?://)|0x[a-fA-F0-9]{40}";
const keywordsToRemove = "sale,presale,tge";

console.log("原始正则表达式:", fullRegex);
console.log("要删除的关键词:", keywordsToRemove);

const reducedRegex = handle._delkey(fullRegex, keywordsToRemove);
console.log("删除后的正则表达式:", reducedRegex);

// 测试删除后的正则表达式
const reducedRegexTest = new RegExp(reducedRegex);
console.log("\n=== 测试删除后的正则表达式 ===");
console.log("测试 'sale' :", reducedRegexTest.test("sale")); // 应该为 false
console.log("测试 'presale' :", reducedRegexTest.test("presale")); // 应该为 false
console.log("测试 'tge' :", reducedRegexTest.test("tge")); // 应该为 false
console.log("测试 'launch' :", reducedRegexTest.test("launch")); // 应该为 true（未删除）
console.log("测试 'live' :", reducedRegexTest.test("live")); // 应该为 true（未删除）

// 测试用例：删除所有关键词
console.log("\n=== 测试删除所有关键词 ===");
const allKeywords = "sale,presale,live,launch,tge,ido,ifo,ieo,ico,come,coming,ca,contract,https?://";
const onlyHexRegex = handle._delkey(fullRegex, allKeywords);
console.log("删除所有关键词后:", onlyHexRegex);

// 应该只剩下十六进制地址部分
const hexOnlyTest = new RegExp(onlyHexRegex);
console.log("测试十六进制地址:", hexOnlyTest.test("0x1234567890123456789012345678901234567890"));
console.log("测试普通词汇:", hexOnlyTest.test("launch"));

// 测试组合：添加然后删除
console.log("\n=== 测试组合操作：添加然后删除 ===");
const step1 = handle._addkey(existingRegex, "pump,moon,rocket");
console.log("添加 pump,moon,rocket 后:", step1);
const step2 = handle._delkey(step1, "pump,launch");
console.log("删除 pump,launch 后:", step2);

const finalTest = new RegExp(step2);
console.log("测试最终结果:");
console.log("测试 'pump' :", finalTest.test("pump")); // 应该为 false（已删除）
console.log("测试 'moon' :", finalTest.test("moon")); // 应该为 true（添加了但未删除）
console.log("测试 'launch' :", finalTest.test("launch")); // 应该为 false（已删除）
console.log("测试 'rocket' :", finalTest.test("rocket")); // 应该为 true（添加了但未删除）

// 测试 _extractKeywordsFromRegex 方法
console.log("\n=== 测试 _extractKeywordsFromRegex 方法 ===");
const testRegex = "(?:sale|presale|live|launch|tge|ido|ifo|ieo|ico|come|coming|ca|contract|https?://)|0x[a-fA-F0-9]{40}";
const extractedKeywords = handle._extractKeywordsFromRegex(testRegex);
console.log("原始正则表达式:", testRegex);
console.log("提取的关键词:", extractedKeywords);
console.log("关键词字符串长度:", extractedKeywords.length);
console.log("包含的字符:", [...extractedKeywords].map(char => char.charCodeAt(0)));

// 测试包装在反引号中的效果
const wrappedKeywords = `\`${extractedKeywords}\``;
console.log("包装后的关键词:", wrappedKeywords);
console.log("包装后字符串长度:", wrappedKeywords.length);
