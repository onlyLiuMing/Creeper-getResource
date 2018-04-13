const fs = require('fs');
const {URL} = require('url');
const {spawnSync} = require('child_process');

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
  let path = urlData.pathname;

  let _filename = path.slice(path.lastIndexOf('/') + 1);
  let _dirpath = path.slice(0, path.lastIndexOf('/'));

  // 创建文件夹路径
  mkdirFloder(`./temp/${hostname}${_dirpath}`);
  spawnSync('wget', [href, `-Otemp/${hostname}${_dirpath}/${_filename}`]);
  if (array.length - 1 === index) {
    close();
  }
})

// 超过10s后自动关闭node进程
setTimeout(() => {
  process.exit();
}, 10000)

function close() {
  console.log('Get resource finished !!!');
  clearTimeout(waitCloseTimer);
  process.exit();
}

// ********************************************** 读取文件、清洗数据
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
