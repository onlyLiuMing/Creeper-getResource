var page = require('webpage').create();
var fs = require('fs');
var args = require('system').args;

// 定时器，最大等待时间
var maxWait = 8000;
var maxWaitTimer;

// 单个资源等待时间
const resourceWait = 1000;
var resourceTimer;

// 资源计数
var resourceCount = 0;

// 读取输入的url
const target_url = args[1];
console.log('TargetUrl : ', target_url);

// 存储路径
const path = '/Users/liuming/Git/phantom/links/links.txt';
var startTime,
		endTime;

var close = function () {
		clearTimeout(maxWaitTimer);
		console.log('Get links finished !!!');
		phantom.exit();
}

// 清理存储文件
fs.write(path, '', 'w');

page.onLoadStarted = function () {
		// 记录开始请求的时间
		startTime = new Date().getTime();
}

page.onLoadFinished = function () {
		// 结束加载的时间
		endTime = new Date().getTime();
}

// 设置浏览器
page.settings.userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrom' +
				'e/37.0.2062.120 Safari/537.36';
// 设置浏览器窗口大小
page.viewportSize = {
		width: 1920,
		height: 1080
}
// 页面请求资源
page.onResourceRequested = function (requestData, networkRequest) {
		resourceCount++;
		fs.write(path, requestData.url + '\n', 'a');
};
// 页面收到资源
page.onResourceReceived = function (res) {
		if (res.stage !== 'end') {
				return false;
		}
		resourceCount--;
		if (resourceCount === 0) {
				// 流出js执行的时间
				resourceTimer = setTimeout(close, resourceWait)
		}
}
// 资源超时
page.onResourceTimeout = function () {
		resourceCount--;
}
// 资源加载失败
page.onResourceError = function () {
		resourceCount--;
}
// 开启页面加载
page.open(target_url, function (status) {
		var endTime = '';
		if (status !== 'success') {
				console.log('Unable to access netWork!!');
				phantom.exit(1);
		} else {
				// 注入文件，使页面滚动到最底部，触发懒加载
				if (page.injectJs('phantom_inject.js')) {
						console.log('Script inject successed !!!!');
						// 当页面的初始html返回成功后，开启定时器， 当达到maxwait等待时间时，退出phantom
						maxWaitTimer = setTimeout(close, maxWait);
				}
		}
})
