# comboedr
orewrite require.js，support for combo server
combo server

##  特性
1. combo + require
2. support for localstorage cache 
3. resrouces of css，js，html（precompile）[TODO:only for artTemplate now]）

##  DEMO

    gulp default
    http://127.0.0.1:8991/

## Usage

### Combo Server

#### cwd 
relative path，base on `process.cwd`
#### versionDir 
md5 json file path，base on cwd
#### pathMap 
relative path of resource by file type，base on cwd

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


### include scripts

    <script src="require.js"></script>
    <script src="config.js"></script>
    <script src="loader.js"></script>

### require.js
only support amd and return

### loader.js

    new export.Loader(['file1', 'file2']);
    
####COMBO server
combo url format：

    file_1@version_1;file_2@version_2


### requirejs OPTIONS

#### timeout（ms）
the wating time of loader
#### locPrefix
localStorage prefix
#### webBase
combo host name
#### exportLoader
export the Loader instance to 

    require.config({
       combo: {
           timeout: 60000,
           locPrefix: 'm_lsc_',
           webBase: 'combo'
       },
       exportLoader: window
    });

### UESAGE

    require(['test-1', 'test-2', 'base.css'], function () {
        //callback
    });

##TODO

1. 配置入口优化
2. 支持请求预编译的模板js文件
