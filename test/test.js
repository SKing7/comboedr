var express = require('express');
var http = require('http');
var path = require('path');
var comboServer = require('../service/combo')

var app = express();

app.set('port', 8991);

//cwd 基于process.cwd，资源目录的相对路径
//versionDir 生成文件md5值的json格式文件
//pathMap：不同文件格式的目录的相对于上面设置cwd的相对路径，默认是cwd
app.get('/combo/', new comboServer({
    cwd: 'test/public',
    versionDir: 'data',
    pathMap: {
        css: 'css',
        js: 'js',
        html: 'tpl',
    },
}));

app.use(express.static('test/public'));
http.createServer(app).listen(app.get('port'), function(){
    console.log("Mobile Server listening on port " + app.get('port'));
});

// exports
module.exports = app;
