// import node module
const fs = require('fs');
const {URL} = require('url');
const path = require('path');
const zlib = require('zlib');

// import form node_module
const CDP = require("chrome-remote-interface");
const Mkdir = require('./mkdirR');

// defined default arguments
let url = process.argv[2];
let LINKS = [];

// 清理temps文件夹
deleteFolderRecursive('./temp');

CDP(client => {
  // extract domains
  const {Network, Page, DOM} = client;
  // setup handlers
  Network.requestWillBeSent(params => {
    LINKS.push(params.request.url);
    // console.log(params.request.url);
  });
  Page.loadEventFired(() => {
    // let file = fs.createWriteStream('./links/links.txt');
    // file.write(LINKS.join('\n')); client.close();
  });
  // enable events then start!
  Promise.all([
    Network.enable(),
    Page.enable(),
    DOM.enable()
  ]).then(() => {
    Page
      .getFrameTree()
      .then(args => {
        let frameId = args.frameTree.frame.id; // 框架id
        Page
          .getResourceContent({'frameId': frameId, 'url': 'https://www.taobao.com'})
          .then((args) => {
            let file = fs.createWriteStream('./test.html');
            let content = Buffer.from(args.content);
            file.write(content);
          })
      });
    Page
      .getResourceTree()
      .then((args) => {
        let frameId = args.frameTree.frame.id; // 框架id
        let resources = args.frameTree.resources; // 资源列表
        // 遍历所有的资源
        resources.forEach((item, index) => {
          // 文件类型
          let type = item.type;
          // url解析
          let url = item.url; // 要下载资源的url
          let _url = new URL(url);
          let _protocol = _url.protocol;
          let _hostname = _url.hostname;
          let _pathname = _url.pathname;
          let _search = _url.search;
          let _filename = _pathname.slice(_pathname.lastIndexOf('/') + 1);
          let _dirpath = _pathname.slice(0, _pathname.lastIndexOf('/'));

          if (!(_protocol == 'https:' || _protocol == 'http:')) {
            // 跳过协议不是http或者https请求的协议，例如base64
            return false;
          }

          // 声明文件名，处理特殊情况下的文件名
          let filename = _filename;
          if (!filename) {
            if (/^\?\?/.test(_search)) {
              // 如果出现？？开头的则可能为  淘宝  的特殊url路径
              filename = _search.slice(_search.lastIndexOf('/') + 1);
            }
            if (!filename) {
              // 如果不是？？开头的特殊url，则为默认的文件名：index
              switch (type) {
                case 'Script':
                  filename = 'index.js';
                  break;
                case 'Styleshell':
                  filename = 'index.css';
                  break;
                case 'Html':
                  filename = 'index.html';
                  break;
              }
            }
          }
          console.log(url);
          console.log('filename:', filename);
          console.log('path:', _hostname + _dirpath);
          console.log('##########################');

          // 创建路径
          Mkdir(`./temp/${_hostname + _dirpath}`);
          // 创建写入流
          let file = fs.createWriteStream(`./temp/${_hostname + _dirpath}/${filename}`);
          // 获取文件内容
          Page
            .getResourceContent({'frameId': frameId, 'url': url})
            .then((args) => {
              let isbase64 = args.base64Encoded;
              let content = args.content;
              let content_buffer;
              if (isbase64) {
                content_buffer = Buffer.from(content, 'base64');
              } else {
                content_buffer = Buffer.from(content);
              }
              file.write(content_buffer);
            })
        })
      });
    return Page.navigate({url: url});
  }).catch(err => {
    console.error(err);
    client.close();
  });
}).on("error", err => {
  // cannot connect to the remote endpoint
  console.error(err);
});

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