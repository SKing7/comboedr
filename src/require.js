(function () {

    var PREFIX = '__r@';
    var SLASH = '/';
    var moduleError = false;
    var modulesDef = {};
    var modulesCacheMap = {};
    var noop = function () {};
    var callingModuleMap = [];
    var loadingMap = {};
    var pathsConfig = M.requireConf.paths;
    var requireCounter = 0;
    var reqer;
    var isPreRendered = M.re.isPreRendered; 

    var op = Object.prototype;
    var ostring = op.toString;

    function Module(name, deps, cb) {
        var checkCached;
        if (this === window) {
            checkCached = modulesDef[name];
            if (checkCached) {
                return checkCached;
            } else {
                return new Module(name, deps, cb);
            }
        }
        this.name = name;
        this.deps = formatDeps(deps);
        this.cb = cb;
        function formatDeps(deps) {
            var parsedDeps = [];
            each(deps, function (v, k) {
                var tmpDep,
                    extName;

                if (v) {
                    tmpDep = normalizeDep(name, v);
                    extName = ext(tmpDep);
                    if (extName === 'css' || extName === 'html') {
                        parsedDeps[k] = tmpDep + '.js'; 
                    } else {
                        parsedDeps[k] = tmpDep; 
                    }
                }
            });
            return parsedDeps;
        }
    }
    var proto = Module.prototype;
    proto.exec = function () {
        var _t = this;
        var args;
        var index;
        var execObj;
        //注意：可能是undefined
        if (hasProp(modulesCacheMap, _t.name)) {
            return modulesCacheMap[ _t.name];
        }
        args = _t.args();
        if (args.length === _t.deps.length) {
            index = each(callingModuleMap, function (v, k) {
                if (v.name === _t.name) {
                    return k; 
                }
            });
            if (index >= 0){
                callingModuleMap.splice(index, 1);
            }
            if (_t.cb) {
                execObj = _t.cb.apply(window, args);
                modulesCacheMap[_t.name] = execObj;
                return execObj;
            } else {
                return args[0];
            }
        } else {
            return { msg: 'not loaded' };
        }
    };
    proto.args = function () {
        var args = [];
        var _t = this;
        var tmp;
        if (_t.checkFullLoaded()) {
            each(_t.deps, function (dep) {
                //exec里有相同的判断cache逻辑，放到这里是减少一层函数的调
                if (hasProp(modulesCacheMap, dep)) {
                    tmp = modulesCacheMap[dep];
                    args.push(tmp);
                } else {
                    tmp = Module(dep).exec();
                    if (hasProp(modulesCacheMap, dep)) {
                        args.push(tmp);
                        modulesCacheMap[dep] = tmp;
                    }
                }
            });
        }
        return args;
    };
    proto.checkFullLoaded = function () {
        var _t = this;
        var mdQueue;
        mdQueue = _t.initLoadDepQueue();
        if (mdQueue.length) {
            callingModuleMap.push({
                name: _t.name,
                q: mdQueue
            });
            return false;
        }
        return true;
    };
    proto.initLoadDepQueue = function () {
        var resQueue = [];
        var mdQueue = [];
        var _t = this;
        var shimedModules = [];
        var tmpPath;
        var resLength;
        each(_t.getAllDeps(), function (dep) {
            if (!hasProp(modulesDef, dep)) {
                mdQueue.push(dep);
                tmpPath = getPath(dep);
                if (tmpPath !== dep) {
                    shimedModules.push(dep);
                }
                if (!ext(tmpPath)) {
                    tmpPath += '.js';
                }
                if (isLoading(tmpPath)) {
                    return;
                }
                resQueue.push(tmpPath);
                loadingMap[tmpPath] = 1;
            }
        });
        resLength = resQueue.length;
        if (resLength && !moduleError) {
            new M.util.loader(resQueue, null, function () {
                each(shimedModules, function (v) {
                    modulesDef[v] = new Module(v, [], noop);
                });
                _t.exec();
                resetLoadStatus(resQueue);
                checkCalledQueue();
                shimedModules = null;
            });
        } 
        function resetLoadStatus(queue) {
            each(queue, function (v, k) {
                delete loadingMap[v];
            });
        }
        function isLoading(name) {
            return hasProp(loadingMap, name);
        }
        return mdQueue;
    };
    proto.getAllDeps = function () {
        var r = [];
        var _t = this;
        var path = _t.name;
        each(_t.deps, function (dep) {
            r.push(normalizeDep(path, dep));
            each(modulesDef, function (mod, name) {
                if (name === dep) {
                    r = r.concat(mod.getAllDeps());
                }
            });
        });
        _t.allDeps = r;
        return r;
    };

    reqer = {
        require: function (deps, cb) {
            var requireName = PREFIX + requireCounter++;
            var requireModule;
            deps = deps || [];
            if (type(deps, 'string')) {
                deps = [deps];
            } else if (!type(deps, 'array')) {
                makeError('非法调用模块', '', null, deps);
            }
            requireModule = new Module(requireName, deps, cb);
            modulesDef[requireName] = requireModule;
            return requireModule.exec();
        },
        define: function (name, deps, cb) {
            deps = deps || [];
            if (!type(deps, 'array')) {
                makeError('非法定义模块', name, null, deps);
            }
            modulesDef[name] = new Module(name, deps, cb);
        }
    };

    function checkCalledQueue() {
        eachReverse(callingModuleMap, function (item) {
            var v = item.q;
            while (v.length) {
                if (hasProp(modulesCacheMap, v[0])) {
                    v.splice(0, 1);
                } else {
                    break;
                }
            }
            if (!v.length) {
                Module(item.name).exec();
            }
        });
    }
    function normalizeDep(base, path) {
        var i, len, token, src, target = [];
        if (!path || path === SLASH) {
            return SLASH;
        }
        src = path.split(SLASH);
        if (path.charAt(0) === '.') {
            src = base.split(SLASH).slice(0, -1).concat(src)
        }
        for (i = 0, len = src.length; i < len; ++i) {
            token = src[i] || '';
            if (token === '..') {
                if (target.length > 1) {
                    target.pop();
                }
            } else if (token !== '' && token !== '.') {
                target.push(token);
            }
        }
        return target.join(SLASH) || SLASH;
    }
    function type(o, str) {
        return ostring.call(o).slice(8, -1).toLowerCase() === str;
    }
    function makeError(id, name, err, requireModules) {
        var e = new Error(id + ':' + name);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        moduleError = true;
        throw e;
    }
    function each(ary, func) {
        var i;
        var result;
        for (i in ary) {
            if (hasProp(ary, i) && ary[i] !== undefined) {
                result = func(ary[i], i, ary);
                if (result !== undefined && result !== false) {
                    return result;
                }
            }
        }
    }
    function eachReverse(ary, func) {
        var k;
        var result;
        for (k = ary.length - 1; k >= 0; k--) {
            if (ary[k] !== undefined) {
                result = func(ary[k], k, ary);
                if (result !== undefined && result !== false) {
                    return result;
                }
            }
        }
    }
    function ext(f) {
        var arr = f.split('.');
        if (arr.length > 1) {
            return f.split('.').pop();
        }
        return '';
    }
    function hasProp(obj, prop) {
        return op.hasOwnProperty.call(obj, prop);
    }
    function getPath(dep) {
        return pathsConfig[dep] || dep;
    }
    function initDefedModules() {
        var modules = document.querySelectorAll('[data-module]');
        [].forEach.call(modules, function (node) {
            var name = node.getAttribute('data-module')
            var ext = name.split('.');
            if (ext[ext.length - 1] === 'js' && ext[ext.length - 2] === 'css') {
                modulesDef[name] = new Module(name, [], function () {
                    return {name: name};
                }); 
            }
        });
    }
    reqer.define.amd = { jQuery: true };
    window.require = reqer.require;
    window.define = reqer.define;
    if (isPreRendered) {
        initDefedModules();
    }
}(this));
