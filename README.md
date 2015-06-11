# comboedr
重写require.js，支持前端combo
combo server

##  特性
1. 前后端combo + require
2. 支持localstorage缓存
3. 支持css，js，【html（预编译）：TODO】）

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


### 前端

    <script src="require.js"></script>
    <script src="config.js"></script>
    <script src="loader.js"></script>


### 自定义配置：config.js

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
