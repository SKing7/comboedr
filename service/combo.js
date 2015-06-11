var FILE_SPLITER = ';';

var codeSep = '/*!__COMBO_SEPARATOR__*/';

var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var debug;
var sep = path.sep;
var rootPath;

var versionPath = [__dirname, '..', '..', 'version.json'].join(sep);

var versionJson = getNowVersionMap();
var relativeToRoot = path.join('..', '..');

module.exports = {
    init: function (app) {
        var srcBaseUrl = relativeToRoot;
        app.get('/combo/', this.handle);
        debug = app.get('env') !== 'production';
        rootPath = {
            css: path.join(srcBaseUrl, 'css'),
            js: path.join(srcBaseUrl, 'lib'),
        };
    },

    handle: function (req, res, next) {
        var rootReletivePath,
            url = req.url,
            body,
            q,
            combineFiles,
            type,
            fileList,
            userVersionMap,
            pending;

        q = parseQuery(url);
        body = [];
        if (q.f) {
            fileList = q.f.split(FILE_SPLITER);
            userVersionMap = rmVersion(fileList);
        } else {
            return handleError('no file requested:' + q);
        }
        if (!fileList || fileList.length === 0) {
            return handleError('type is null:' + fileList);
        }
        pending = fileList.length;
        //debug: [all.js]
        _.forEach(fileList, function (v, k) {
            var tmpFileArray = v.split('.');
            var realName = filterFileName(tmpFileArray);
            type = getExt(realName);
            rootReletivePath = rootPath[type] || relativeToRoot;;
            if (userVersionMap) {
                //指定文件的版本不存在或者版本不一致
                if (!versionJson || (userVersionMap[realName] && userVersionMap[realName] !== versionJson[realName])) {
                    return handleError('file version do not match:' + JSON.stringify(userVersionMap));
                }
            }
            readFileStep(k, v, type);
        });
        function readFileStep(index, keyName, type) {
            var bodyContent;
            var fullPath
            var fileArray = keyName.split('.');
            var realName = filterFileName(fileArray);
            fullPath = path.normalize(path.join(rootReletivePath, realName));
            //检查路径的安全性
            if ((!fullPath || fullPath.indexOf(rootReletivePath) !== 0)) {
                return handleError('path is invalid:' + keyName);
            }
            fullPath = path.normalize(__dirname + '/' + fullPath);
            fs.readFile(fullPath, 'utf8', function (err, data) {
                if (err) { 
                    return handleError('read file error:' + keyName);
                }
                updateStatus(wrapperContent(data));
            });
            //更新暂存区的数据，检查是否所有读取完毕
            function updateStatus(data) {
                pending--;
                body[index] = data + '\n';
                if (pending === 0) {
                    handleSuccess();
                }
            }
            function wrapperContent(content) {
                var tmpFileArray = fileArray;
                var len = tmpFileArray.length;
                var realExt;
                //例如main.css.js
                if (len > 2 && tmpFileArray[len - 1] === 'js') {
                    realExt = tmpFileArray[len - 2];
                }
                switch (realExt) {
                case 'css':
                    content = wrapCssToScript(content, realName);
                    break;
                case 'html':
                    content = wrapHtmlToScript(content, realName);
                    break;

                }
                return content;
            }
        }
        function handleSuccess() {
            var rt = '';
            supportCors();
            res.charset = 'utf-8';
            res.contentType('text/plain');
            rt = body.join(codeSep);
            res.end(rt);
        }
        function handleError(msg) {
            console.error(msg);
            supportCors();
            res.charset = 'utf-8';
            res.type('text/plain');
            res.header('Cache-Control', 'private,no-store');
            res.header('Expires', new Date(0).toUTCString());
            res.header('Pragma', 'no-cache');
            res.status(400).end(msg);
        }
        function supportCors() {
            res.header("Access-Control-Allow-Origin", "*");
        }
    }

}
/*
 * 解析url得到query的对象形式
 **/
function parseQuery(url) {
    var parsed = {},
        query  = url.split('?')[1];

    if (query) {
        query = decodeURIComponent(query);
        query.split('&').forEach(function (item) {
            var tmp = item.split('='); 
            if (tmp.length === 2) {
                parsed[tmp[0]] = tmp[1];
            }
        });
    }
    return parsed;
}
/*
 * 解析url中的版本号信息，并根据文件名对应
 **/
function rmVersion(files) {
    var version = null;
    var index;
    var tmpFileName;
    _.forEach(files, function (v, k) {
        index = v.indexOf('@');
        if (index >= 0) {
            tmpFileName = v.substr(0, index);
            files[k] = tmpFileName; 
            version = version || {};
            version[tmpFileName] = v.substr(index + 1); 
        } 
    });
    return version;
}
/*
 * main.css.js的ext为css
 * main.js的ext为js
 **/
function getExt(filename) {
    var fileArray = filename.split('.');
    var len = fileArray.length;
    if (len > 2) {
        return fileArray[len - 2];
    }
    return fileArray[len - 1];
}
//根据请求名字得到文件名；main.css.js->main.css
function filterFileName(fileArray) {
    if (fileArray.length > 2) {
        return fileArray.slice(0, -1).join('.')
    }
    return fileArray.join('.')
}
/*
 * 文件version
 **/
function getVersion(file) {
    return file.substr(file.indexOf('@'));
}
/*
 * 文件名
 **/
function getName(v) {
    return v.substring(0, v.lastIndexOf('.'));
}
/*
 * 所有文件版本号map
 **/
function getNowVersionMap(){
    var versionExist = fs.existsSync(versionPath);
    if (versionExist) {
        return JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
    }
}
function wrapHtmlToScript(content, fileName) {
    return content;
}
function wrapCssToScript(content, fileName) {
    return "define('" + name+ ".js', [], function () {"
    + "return (function(c){var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';c=unescape(c);d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})\n"
    + "('" + escape(styles) + "');\n"
    + "});"
}

