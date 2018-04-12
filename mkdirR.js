var fs = require('fs');

module.exports = function (path) {
  var _path = path.split('/');
  var a_path = _path.slice(1);
  var f_path = _path[0];
  if (f_path !== '.') {
    console.log('第一层目录必须是 ./')
    return false;
  }

  var current_path = '.';
  for (var dir of a_path) {
    current_path += '/' + dir;
    try {
      fs.readdirSync(current_path)
    } catch (err) {
      console.log(`创建文件夹 ${current_path}`);
      fs.mkdirSync(current_path)
    }
  }

  return true;
}