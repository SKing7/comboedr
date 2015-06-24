(function () {
    var doc = document;
    var head = doc.head || doc.getElementsByTagName('head')[0];
    var op = Object.prototype;

    var loaderCounter = 0;
    var loaderMap = [];
    var noop = function () {};

    var rconfig = require.config();

    var comboConf = rconfig.combo;
    var exportTo  = rconfig.exportLoader || window;
    var sep =  "/*!__COMBO_SEPARATOR__*/";
    var versionMap = rconfig.versionMap || {};
    var comboBase = (comboConf.webBase || '') + '?f=';
    var storagePrefix = comboConf.locPrefix || '';
    var TIMEOUT = comboConf.timeout;
    var defaultVersion = new Date().getTime();
    var ATTR_MARKER = 'data-module';

    var domCreater = {
        js: function (js, name) {
            if (!js) return;
            var script = doc.createElement('script');
            script.text = js;
            if (name) {
                script.setAttribute(ATTR_MARKER,  name);
            }
            return script;
        }
    };
    var assets = {
        getLoc: function (key) {
            var v = this.getVersion(key) || defaultVersion;
            try {
                var item = localStorage.getItem(storagePrefix + key);
                item = JSON.parse(item || '') || {};
                if (item.v && item.v === v && item.data) return item;
            } catch(e) {
            }
            return false;
        },
        addLoc: function (key, data) {
            var v = this.getVersion(key) || defaultVersion;
            var obj = {};
            obj.stamp = new Date().getTime();
            //没有版本号的按发布版本来缓存
            obj.v = v;
            obj.data = data;
            key = storagePrefix + key;
            try {
                localStorage.setItem(key, JSON.stringify(obj));
                return true;
            } catch(e) {
                if (e.name.toUpperCase().indexOf('QUOTA') >= 0) {
                    //local溢出
                }
            }
        },
        getVersion: function (key) {
            var tmpArr = key.split('.');
            var v;
            //e.g. api.css.js
            if (tmpArr.length > 2) {
                v = versionMap[tmpArr.slice(0, -1).join('.')];
            } else {
                v = versionMap[key];
            }
            return v;
        }
    };

    function Loader(modules, opt, cb) {
        this.cb = cb || noop;
        this.opt = opt = opt || {};
        this.id = loaderCounter++;
        this.init(modules);
        this.start();
    }
    var proto = Loader.prototype;
    proto.start = function () {
        if (this.loadQueue.length) {
            this.fetch();
        } else {
            this.end();
        }
    };
    proto.init = function (modules) {
        var _t = this;
        var tmpLocData;
        var lm = _t.loadMap = {};
        var lq = _t.loadQueue = [];
        each(modules, function (v) {
            lm[v] = 1; //占位,保持顺序
        });
        each(modules, function (v) {
            tmpLocData = assets.getLoc(v);
            if (tmpLocData) {
                lm[v] = tmpLocData.data;
            } else {
                lq.push(v);
            }
        });
        loaderMap[_t.id] = {status: 0};
    };
    proto.fetch = function () {
        var _t = this;
        ajax(comboUrl(_t.loadQueue), function (data) {
            _t.handle(data);
        }, _t.opt);
    };
    proto.handle = function (data) {
        var _t = this;
        var  loadQueue = _t.loadQueue;
        var arrData =  data.split(sep);
        each(loadQueue, function (v, k) {
            _t.loadMap[v] = arrData[k];
            //localstorage性能问题
            updateLoc(v, k);
        });
        if (_t.opt.domready) {
            domReady(function () {
                _t.end();
            });
        } else {
            _t.end();
        }
        function updateLoc(v, k) {
            window.setTimeout(function () {
                assets.addLoc(v, arrData[k]);
            }, k * 16);
        }
    };
    proto.end = function () {
        var _t = this;
        if (each(_t.opt.deps, function (v) {
            if (!loaderMap[v] || !loaderMap[v].status) {
                return true;
            }
        })) {
            loaderMap[_t.id].delay = function () {
                _t.end();
            };
            return;
        }
        _t.appendToDoc();
        loaderMap[_t.id].status = 1;
        window.setTimeout(function () {
            _t.cb();
            each(loaderMap, function (v) {
                if (!v.status && v.delay) {
                    v.delay();
                }
            });
        }, 0);
    };
    proto.appendToDoc = function () {
        var tmpDoc = doc.createDocumentFragment();
        var ex;
        var _t = this;
        each(_t.loadMap, function (v, k) {
            ex = ext(k);
            tmpDoc.appendChild(domCreater[ex](v, k));
        });
        head.appendChild(tmpDoc);
    };
    function ajax(url, cb, opt) {
        opt = opt || {};
        var async = !opt.sync;
        var xhr = new window.XMLHttpRequest();
        xhr.open('GET', url, async);
        //超时计时开始
        setTimeout(function () {
            if(xhr.readyState < 4) {
                xhr.abort();
            }
        }, TIMEOUT);
        //异步或同步
        if (async) {
            xhr.onreadystatechange = done;
            xhr.send();
        } else {
            xhr.send();
            done();
        }
        function done() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 304) {
                    cb(xhr.responseText, xhr.getResponseHeader('content-type'));
                } else if (xhr.status === 400) {
                    window.alert('网络出错，请稍后"刷新重试"');
                }
            }
        }
    }
    function comboUrl(files) {
        var rt = '';
        var f;
        var v;
        var noVersionInfo = false;
        for (var i = 0; i < files.length; i++) {
            f = files[i];
            v = assets.getVersion(f);
            if (v) {
                rt += f + '@' + v + ';';
            } else {
                rt += f + ';';
                noVersionInfo = true;
            }
        }
        rt = comboBase + encodeURIComponent(rt.substr(0, rt.length - 1));
        if (noVersionInfo) {
             rt += '&v=' + defaultVersion;
        }
        return rt;
    }
    function domReady(fn) {
        if (doc.readyState === 'interactive' || doc.readyState === 'complete') {
            fn();
        } else {
            doc.addEventListener("DOMContentLoaded", fn);
        }
    }
    function isEmpty(obj) {
        for (var key in obj) {
            if (hasProp(obj, key)) return false;
        }
        return true;
    }
    function ext(f) {
        var arr = f.split('.');
        if (arr.length > 1) {
            return f.split('.').pop();
        }
        return '';
    }
    function each(ary, func) {
        var i;
        var result;
        for (i in ary) {
            if (hasProp(ary, i) && ary[i] !== undefined && (result = func(ary[i], i, ary))) {
                return result;
            }
        }
        return false;
    }
    function hasProp(obj, prop) {
        return op.hasOwnProperty.call(obj, prop);
    }

    exportTo.Loader = Loader;
}(this));
