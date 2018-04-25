const fs = require('fs');
const {URL} = require('url');
const {spawnSync} = require('child_process');
const http = require('http');
const https = require('https');
const path = require('path');

const mkdirFloder = require('./mkdirR');

const maxWait = 10000;
const resourceWait = 200;
var waitCloseTimer;

// 清理temps文件夹
deleteFolderRecursive('./temp');
// 清洗数据
var URL_LIST = clearData('./links/links.txt');
// console.log(URL_LIST);

URL_LIST.forEach((item, index, array) => {
  let urlData = new URL(item);
  let href = urlData.href;
  let hostname = urlData.hostname;
  let protocol = urlData.protocol;
  let path = urlData.pathname;

  let _filename = path.slice(path.lastIndexOf('/') + 1);
  let _dirpath = path.slice(0, path.lastIndexOf('/'));

  let log;

  // 创建文件夹路径
  mkdirFloder(`./temp/${hostname}${_dirpath}`);

  //  下载文件到制定路径 如果没有文件名，只有路径的话，则不进行请求(这里需要改成文件名为index.html) download({url: href,
  // filename: _filename, host: hostname, path: path, protocol: protocol})
  download({protocol: protocol, hostname: hostname, path: path});

  if (array.length - 1 === index) {
    // close();
  }
})

// 超过10s后自动关闭node进程
setTimeout(() => {
  process.exit();
}, 10000)

function close() {
  console.log('Get resource finished !!!');
  clearTimeout(waitCloseTimer);
  setTimeout(() => {
    process.exit();
  }, 2000)
}

/********************* 工具函数 *************************/
// 读取文件、清洗数据
function clearData(path) {
  var dataList = fs
    .readFileSync(path)
    .toString()
    .split('\n');

  // 去重,去空,清洗数据
  var arr_data = Array.from(new Set(dataList));
  arr_data = arr_data.filter((item, index) => {
    if (!item) 
      return false;
    try {
      let cur_url = new URL(item);
      if (!/(http:|https:)/gi.test(cur_url.protocol)) 
        return false;
      return true;
    } catch (err) {
      console.error('出现错误的url：', item);
      console.error('错误信息:', err);
      return false;
    }
  })

  return arr_data;
}

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

// 下载文件到指定路径
function download(option) {
  // url配置（后面的path会用到）
  let _option = option;
  let req;
  let LOG = '';
  let LogFile = fs.createWriteStream('./log', {flags: 'r+'})

  // 发送请求配置
  let req_option = {
    protocol: _option.protocol,
    hostname: _option.hostname,
    path: _option.path,
    method: 'GET'
  }

  // 文件存储路径
  let regx = /\/$/;
  let Path;
  if (regx.test(_option.path)) {
    Path = path.resolve(__dirname, `temp/${_option.hostname}${_option.path}/index.html`);
  } else {
    Path = path.resolve(__dirname, `temp/${_option.hostname}${_option.path}`);
  }

  // 请求文件
  if (req_option.protocol === 'https:') {
    req = https.get(req_option, httpCB);
  } else {
    req = http.get(req_option, httpCB)
  }

  req.on('error', e => {
    let info = `Request Happend Error: ${e}`;
    LOG += info + '\n';
    LogFile.write(info + '\n');
    console.log(info);
  })

  req.end();

  // 文件请求的回调函数(内部的文件流需要Path变量，所以此函数写在download函数体内)
  function httpCB(res) {
    if (res.statusCode == 200) {
      // console.log(res.headers); 声明文件流，response文件流
      let body = Buffer.from('');
      let file = fs.createWriteStream(Path);
      file.on('error', function (err) {
        console.log(err);
      })
      // 合并chunk中的数据块
      res.on('data', function (chunk) {
        body = Buffer.concat([body, chunk]);
      });
      // 写入文件
      res.on('end', function () {
        let log;
        file.write(body, err => {
          if (err) {
            log = `Input File Happend Error: ${err}`;
            LOG += log + '\n';
            LogFile.write(log + '\n');
            console.log(log);
            file._destroy();
          } else {
            log = `写入成功：${Path}`;
            LOG += log + '\n';
            LogFile.write(log + '\n');
            console.log(log);
          }
        })
      });
      res.on('error', function (err) {
        let log = `获取response时发生了错误: ${err}`;
        LOG += log + '\n';
        LogFile.write(log + '\n');
        conosle.log(log);
      })
    } else {
      let log = `Response Happend Error, StatusCode is : ${option.protocol + option.hostname + option.path}`;
      LOG += log + '\n';
      LogFile.write(log + '\n');
      console.log(log);
    }
  }
}