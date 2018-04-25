// import node module
const fs = require('fs');

// import npm module
const puppeteer = require('puppeteer');

/* 初始化变量 */
// 读取命令行传入的值
const URL = process.argv[2];
// 最大等待时间
const maxWaitTime = 10000;
let count = 0;

(async() => {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  page.emulate({
    viewport: {
      width: 1920
    }
  });
  await page.goto(URL);

  page
    .content()
    .then(html => {
      console.log(html);
    });
  page.on('request', (req) => {
    let url = req._url;
    // console.log(url);
  });
  page.on('response', (res) => {
    var file = fs.createWriteStream('1.jpg');

    count++;
    console.log(res.url());
  });
  page.on('load', (script) => {})
})();