基于phantom,chrome headless的小爬虫脚本(一共是三个类型的脚本)
----------
之前觉得爬虫是个挺牛逼的技术活，最近公司要弄个脚本测试一下目标URL，顺手抓一下资源,因为phantom是js工具，老板就让我这个菜鸡前端做了，那叫一个蛋疼啊，好在最后大体上弄了出来，反正是自己人瞎几把用用，在高深了我貌似就不太懂了

### 实现思路

- 先用puppeteer（phantom、chrome-remote-interface）进行资源url的抓取并写入文件
- wget（或者node脚本进行）下载资源
- 写了个贼拉简单的shell（用来连接几个文件的执行） 省的好几步去操作node、phantom了

### 执行方式：
- >基于chrome-remote-interface工具的直接 ./run-cri  https://www.baidu.com 就行了(使用前需要先打开chrome的远程调试端口为9222)
- >基于phantom工具的直接 ./run-phantom  https://www.baidu.com 就行了
- > 基于puppeteer工具的直接 ./run-puppeteer  https://www.baidu.com 就行了
- >确保环境上有node、phantom、wget、chrome这三个东西
- >我的node是9.3.0版本，主要是用了fs process_child模块

### 注意

- 基于chrome-remote-interface工具是操作chrome的，本身并没有集成chrome，所以需要手动开启chrome的远程调试端口为9222
    `$ /Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --headless --remote-debugging-port=9222`
- 基于puppeteer工具的是需要对chrome进行全局变量设定的，请注意

#### 修改日志
4-13-2018
- 对getlinks.js中获取链接时，出现重复clear link.js文件的情况做了调整
- 对getRe.js中下载文件时，以 ‘文件名？+hash’ 命名下载的情况作出修改，现在为 ‘文件名’

4-25-2018
- 由于phantom对资源抓取的并不是很全，而且phantom已经不维护了，所以用chrome headless重写了一下
- puppeteer是对chrome的操作api，可以完全模拟用户行为；
- chrome-remote-interface是基于chrome远程调试协议的第三方操作api,可以进行页面调试

#### 总结
一开始没觉得是写爬虫的感觉，一直以为是模拟请求来抓链接标签
（chrome-remote-interface对资源抓取的比较全面，而且可控性较好）

搜搜别人的博客才发现，原来大家都用它写爬虫，那一瞬间我菜鸡的身影又高大了几分,不过写的还是最基本的用法而已，只是自己长了长见识

ps: `反正在这里也没人看到，就当发微博乐一乐了`
