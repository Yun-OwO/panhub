// 测试 TG 消息解析是否正确移除 URL
import { load } from "cheerio";

// 测试多个不同的消息格式
const testCases = [
  {
    name: "多平台链接在一行",
    text: "阿凡达3 非正式版 夸克：https://pan.quark.cn/s/6398fbc3051dUC:https://drive.uc.cn/s/df733fa1f6c64?public=1百度: https://pan.baidu.com/s/1jPVy8DUzamd0Tsnc3C52YA?pwd=wogg",
    expectedTitle: "阿凡达3 非正式版",
    shouldNotContain: ["http", "夸克", "UC", "百度", "：", ":"]
  },
  {
    name: "正常换行格式",
    text: "电影名称\n夸克：https://pan.quark.cn/s/xxx\nUC:https://drive.uc.cn/s/yyy",
    expectedTitle: "电影名称",
    shouldNotContain: ["http", "夸克", "UC"]
  },
  {
    name: "只有标题无链接",
    text: "这是一个标题",
    expectedTitle: "这是一个标题",
    shouldNotContain: ["http"]
  },
  {
    name: "标题包含部分链接",
    text: "测试 https://example.com 的标题",
    expectedTitle: "测试 的标题",
    shouldNotContain: ["http", "example.com"]
  }
];

console.log("=== TG 消息解析测试 ===\n");

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`测试: ${testCase.name}`);
  console.log(`输入: ${testCase.text}`);

  const firstLine = testCase.text.split("\n")[0] || testCase.text.slice(0, 80);

  // 提取 URL
  const urlPattern = /https?:\/\/[A-Za-z0-9\-._~:\/?#\[\]@!$&'()*+,;=%]+/g;
  const urls = testCase.text.match(urlPattern) || [];

  // 生成 title
  let title = firstLine;
  for (const url of urls) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    title = title.replace(new RegExp(escaped, "g"), "");
  }
  title = title
    .replace(/(夸克|UC|百度|阿里|迅雷|115|天翼|123|移动|提取码|密码|：|:|，|,|。|\.|、|\||-)+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!title) title = firstLine.slice(0, 80);

  console.log(`输出标题: ${title}`);

  // 验证
  const titleMatch = title === testCase.expectedTitle;
  const noBadContent = testCase.shouldNotContain.every(bad => !title.includes(bad));

  if (titleMatch && noBadContent) {
    console.log("✅ 通过\n");
    passed++;
  } else {
    console.log("❌ 失败");
    if (!titleMatch) console.log(`  期望: "${testCase.expectedTitle}"`);
    if (!noBadContent) {
      const found = testCase.shouldNotContain.filter(bad => title.includes(bad));
      console.log(`  不应包含: ${found.join(", ")}`);
    }
    console.log();
    failed++;
  }
}

console.log(`\n=== 结果: ${passed}/${testCases.length} 通过 ===`);
process.exit(failed > 0 ? 1 : 0);
