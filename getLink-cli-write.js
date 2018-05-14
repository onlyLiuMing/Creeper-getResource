// import node module
const fs = require('fs');
const {URL} = require('url');
const path = require('path');
const zlib = require('zlib');

// import form node_module
const CDP = require("chrome-remote-interface");
const Mkdir = require('./mkdirR');

// defined default arguments
let TARGET_URL = process.argv[2];
let LINKS = [];
let TIMER;

// 清理temps文件夹
deleteFolderRecursive('./temp');

CDP(client => {
  // extract domains
  const {Page, DOM, Network} = client;

  // 页面停止加载js时会调用，
  Page.frameStoppedLoading(() => {
    Page
      .getResourceTree()
      .then((args) => {
        // 下载资源列表中的文件
        let frameId = args.frameTree.frame.id; // 框架id
        let resources = args.frameTree.resources; // 资源列表
        // console.log(resources); 遍历所有的资源
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
                case 'Stylesheet':
                  filename = 'index.css';
                  break;
                case 'Document':
                  filename = 'index.html';
                  break;
              }
            }
          }
          // 创建路径
          let hasDir = Mkdir(`./temp/${_hostname + _dirpath}`);
          if (hasDir) {
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

          }
        })
        return args;
      })
      .then((args) => {
        // 下载完资源后，下载index。html页
        let url = args.frameTree.frame.url; // 当前页的url，在这里获取避免302跳导致url与输入的不一致的问题
        let frameId = args.frameTree.frame.id; // 框架id

        let resol_url = new URL(url);
        let _hostname = resol_url.hostname;
        let _pathname = resol_url.pathname;

        // 创建路径
        Mkdir(`./temp/${_hostname + _pathname}`);
        // 获取index.html页的内容
        DOM
          .getDocument({depth: 0, pierce: true})
          .then(nodes => {
            let backendNodeId = nodes.root.backendNodeId;
            let nodeId = nodes.root.nodeId;
            DOM
              .getOuterHTML({nodeId: nodeId, backendNodeId: backendNodeId})
              .then(args => {
                let content_buffer = Buffer.from(args.outerHTML);
                fs
                  .createWriteStream(`./temp/${_hostname + _pathname}/index.html`)
                  .write(content_buffer);
              })
          })
          .catch(err => {
            console.log('获取页面元素发生了错误：', err);
          });

        // 下载index.html源文件
        let file = fs.createWriteStream(`./temp/${_hostname + _pathname}/index_resource.html`)
        Page
          .getResourceContent({frameId: frameId, url: url})
          .then(args => {
            let isbase64 = args.base64Encoded;
            let content = args.content;
            let content_buffer;
            if (isbase64) {
              content_buffer = Buffer.from(content, 'base64');
            } else {
              content_buffer = Buffer.from(content);
            }
            console.log(content_buffer);
            file.write(content_buffer);
          })
          .catch(err => {
            console.log('Get resoutce producted err: ', err);
          })
      })
      .then(() => {
        // 正确下载后,如果一定时间内不再触发event，则关闭client
        close_client(3000);
      })
      .catch(err => {
        console.log('Get resoutce producted err: ', err);
      });

  });
  // enable events then start!
  Promise.all([
    Page.enable(),
    DOM.enable(),
    Network.enable()
  ]).then(() => {
    // 将当前页跳转到目标url
    return Page.navigate({url: TARGET_URL});
  }).catch(err => {
    console.error(err);
    client.close();
  });

  // close client
  function close_client(time) {
    clearTimeout(TIMER);
    TIMER = setTimeout(function () {
      client.close();
    }, time);
  }

  return client;
}).on("error", (err, client) => {
  // cannot connect to the remote endpoint
  console.error(err);
  client.close();
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
