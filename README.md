# comboedr
重写require.js，支持前端combo
combo server

##  特性
1. 前后端combo + require
2. 支持localstorage缓存
3. 支持css，js，html（预编译）[TODO:暂只支持artTemplate预编译html]）

##  DEMO

    gulp default
    http://127.0.0.1:8991/

## Usage

### Combo Server

#### cwd 
资源目录的相对路径，基于process.cwd
#### versionDir 
生成文件md5值的json格式文件路径，基于cwd
#### pathMap 
同文件格式的目录的相对路径，基于cwd

    var comboServer = require('../service/combo')
    app.get('/combo/', new comboServer({
        cwd: 'test/public',
        versionDir: 'data',
        pathMap: {
            css: 'css',
            js: 'js',
            html: 'tpl',
        },
    }));


### 页面引入必要文件

    <script src="require.js"></script>
    <script src="config.js"></script>
    <script src="loader.js"></script>

### require.js
仅支持amd声明方式，不支持exports.modules，只支持reuturn

### loader.js

    new export.Loader(['file1', 'file2']);
    
####请求后端combo
请求格式：

    file_1@version_1;file_2@version_2

require.js中的资源请求都是基于Loader来获得

### 前端配置

#### timeout（ms）
ajax超时时间
#### locPrefix
localStorage前缀，localstorage缓存时的key的前缀
#### webBase
combo服务host
#### exportLoader
Loader实例导出
window.Loader即可请求combo

    require.config({
       combo: {
           timeout: 60000, //ajax超时时间
           locPrefix: 'm_lsc_', //localStorage前缀
           webBase: 'combo' //combo服务host
       },
       exportLoader: window //Loader实例导出
    });

### 调用

    require(['test-1', 'test-2', 'base.css'], function () {
        //callback
    });

##TODO

1. 配置入口优化
2. 支持请求预编译的模板js文件
