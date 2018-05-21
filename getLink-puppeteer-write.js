const fs = require('fs');
const {URL} = require('url');
const puppeteer = require('puppeteer');
const chromelauncher = require('chrome-launcher');
const Mkdir = require('./mkdirR');
const contentTypeList = require('./content-type');

// 定时器，终止进程
let TIMER;
let MaxWaitTime = 3000; // 文件写入完成后，最大等待时间
let RequestCount = 0; // 记录请求的个数

// 传入的参数
const TARGET_URL = process.argv[2];

// 清理temps文件夹
deleteFolderRecursive('./temp');

(async() => {
  console.log('打开浏览器');
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  // 设置page的仿真参数
  page.emulate({
    viewport: {
      width: 1920
    }
  });

  // 在浏览器中插入语句,使页面滑动,避免懒加载
  page.evaluate(body => {
    // 这里的执行环境应该是浏览器
    var countHeight = 0;
    var timer = setInterval(function () {
      window.scrollTo(0, countHeight);
      countHeight += 100;
    }, 10);
  });

  // 设置page的request事件
  page.on('request', () => {
    RequestCount++;
  });

  // 设置page事件
  page.on('response', async response => {
    // 如果请求计数小于0，则请判断为index.html加载完成，读取并写入index.html
    RequestCount--;
    if (RequestCount <= 0) {
      page
        .content()
        .then(html => {
          let paramsAsUrl = new URL(TARGET_URL);
          let _hostname = paramsAsUrl.hostname;
          let _pathname = paramsAsUrl.pathname;
          let _dirpath = _pathname.slice(0, _pathname.lastIndexOf('/'));

          // 创建文件夹（同步）
          Mkdir(`./temp/${_hostname + _dirpath}`);
          fs.writeFile(`./temp/${_hostname + _dirpath}/index_current.html`, html, err => {
            if (err) {
              console.log('写入index_current.html产生了错误');
              return
            }
            Close();
            console.log('index_current.html写入成功');
          })
        })
    }

    let url = response.url();
    let buffer = response.buffer();
    let headers = response.headers();

    // 解析url
    let paramsAsUrl = new URL(url);
    let _protocol = paramsAsUrl.protocol;
    let _hostname = paramsAsUrl.hostname;
    let _pathname = paramsAsUrl.pathname;
    let _search = paramsAsUrl.search;
    let _filename = _pathname.slice(_pathname.lastIndexOf('/') + 1);
    let _dirpath = _pathname.slice(0, _pathname.lastIndexOf('/'));

    console.log(_search);
    // 跳过协议不是http或者https请求的协议，例如base64
    if (!(_protocol == 'https:' || _protocol == 'http:')) 
      return false;
    
    // 声明文件名，处理特殊情况下的文件名,这里会有编码类型的问题
    if (!_filename) {
      _filename = 'index' + contentTypeList[
        headers['content-type']
          .split(';')[0]
          .trim()
      ];
    }
    // 创建文件夹（同步）
    Mkdir(`./temp/${_hostname + _dirpath}`);

    // 写入文件
    buffer.then(body => {
      fs.writeFile(`./temp/${_hostname + _dirpath}/${_filename}`, body, err => {
        if (err) {
          console.log('写入失败', err);
        } else {
          console.log(_filename, '文件写入成功');
        }
        // 当写入完成时，调用关闭进程，有5秒的等待时间
        Close();
      })
    });

  }) // end of page.on.response

  // 跳转到指定url
  await page
    .goto(TARGET_URL)
    .then(response => {
      //这里获取初始的index.html文件，大部分response中会获取,这里放置特殊情况发生
      let url = response.url();
      let buffer = response.buffer();
      // 解析url
      let paramsAsUrl = new URL(url);
      let _hostname = paramsAsUrl.hostname;
      let _pathname = paramsAsUrl.pathname;
      let _dirpath = _pathname.slice(0, _pathname.lastIndexOf('/'));

      // 创建文件夹（同步）
      Mkdir(`./temp/${_hostname + _dirpath}`);
      buffer.then(html => {
        fs.writeFile(`./temp/${_hostname + _dirpath}/index.html`, html, err => {
          if (err) {
            console.log('写入index.html产生了错误');
            return
          }
          Close();
          console.log('index.html写入成功');
        })
      })
    });

})();

/* **************************************** */
// 递归删除
function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs
      .readdirSync(path)
      .forEach(function (file) {
        var curPath = path + "/" + file;
        if (fs.statSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
    fs.rmdirSync(path);
  }
};

// 关闭进程
function Close() {
  clearTimeout(TIMER);
  TIMER = setTimeout(function () {
    process.exit(0);
  }, MaxWaitTime);
}