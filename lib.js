/*
 * @Author: wyuye_
 * @Date: 2021-02-24 13:53:50
 * @Description: 核心库
 */

'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var fs = require('fs-extra'); // fs扩展
var syncExec = require('sync-exec'); // 命令行库
var path = require('path');

const prefix = 'temp'
const tempFolder = path.join(__dirname, prefix)
const tempModules = path.join(__dirname, 'temp/node_modules')
const tempPackage = path.join(__dirname, 'temp/package.json')

/**
 * @description: 初始化文件目录temp，以及package.json
 * @param {*} 写入package.json的数据，结构为Object
 * @return {*}
 */
var setup = function setup(depObj) {
    // 删除临时文件夹
    if (fs.existsSync(tempFolder)) {
        fs.removeSync(tempFolder)
        console.warn(`删除${tempFolder}及所有子文件`)
    }
    // 创建临时文件夹
    fs.mkdirSync(tempFolder)
    console.log(`创建${tempFolder}`)
    fs.mkdirSync(tempModules)
    console.log(`创建${tempModules}`)
    console.log()

    try {
        fs.appendFileSync(tempPackage, JSON.stringify(depObj), 'utf8');
        console.log(depObj)
        console.log('写入package文件成功');
    } catch (err) {
        console.log(err);
    }

    // 执行npm i命令
    const command = `npm i --prefix ${prefix} ${prefix}`
    syncExec(command, { stdio: [0, 1, 2] });
};

var getSizeOfModules = function getSizeOfModules() {
    var modules = {};
    var allModules = fs.readdirSync(tempModules);
    allModules.forEach(function (name) {
        var itemStats = fs.lstatSync(path.join(tempModules, name));
        if (itemStats.isDirectory()) {
            if (name && name[0] === '@') {
                var scopedModules = getScopedModules(name);
                Object.assign(modules, scopedModules);
            } else if (name) {
                var size = dirSize(path.join(tempModules, name));
                modules[name] = size;
            }
        }
    });
    return modules;
};

var dirSize = function dirSize(root) {
    var out = 0;
    var _getDirSizeRecursively = null;
    (_getDirSizeRecursively = function getDirSizeRecursively(rootLocal) {
        var itemStats = fs.lstatSync(rootLocal);
        if (itemStats.isDirectory()) {
            var allSubs = fs.readdirSync(rootLocal);
            allSubs.forEach(function (file) {
                _getDirSizeRecursively(path.join(rootLocal, file));
            });
        } else {
            out += itemStats.size;
        }
    })(root);

    return Math.floor(100 * out / 1024) / 100; /* 返回KB */
};

var getScopedModules = function getScopedModules(scope) {
    var modules = {};
    var allScopes = fs.readdirSync(path.join(tempModules, scope));
    allScopes.forEach(function (name) {
        var itemStats = fs.lstatSync(path.join(tempModules, scope, name));
        if (itemStats.isDirectory()) {
            var size = dirSize(path.join(tempModules, scope, name));
            if (name) {
                modules[scope + '/' + name] = size;
            }
        }
    });
    return modules;
};

/**
 * @description: 获取依赖树
 * @param {*}
 * @return {*}  依赖树json
 */
var getDependencyTree = function getDependencyTree() {
    var result = syncExec(`npm ls --prefix ${prefix} --json --depth=10`);
    return JSON.parse(result.stdout).dependencies;
};

/**
 * @description: 对依赖树排序并返回
 * @param {*}
 * @return {*}  依赖树json
 */
var getRootDependencies = function getRootDependencies() {
    var dependencyTree = getDependencyTree();
    if (!dependencyTree) {
        console.log('There are no dependencies!');
        console.log();
        process.exit(1);
    }
    return Object.keys(dependencyTree).sort();
};

/**
 * @description: 整理依赖树数据
 * @param {*} rootDependencies
 * @return {*}  
 * [{
        name: rootDependency,
        children: [a, b, c, d]
    }]
 */
var calculateNestedDependencies = function calculateNestedDependencies(rootDependencies, moduleSizes) {
    var dependencyTree = getDependencyTree();
    for (var i = 0; i < rootDependencies.length; i++) {
        var dep = rootDependencies[i];
        var nestedDependencies = dependencyTree[dep].dependencies;
        for (const key in nestedDependencies) {
            const element = nestedDependencies[key];
            element.size = moduleSizes[key]
        }
    }
    return dependencyTree
};

module.exports = {
    setup: setup,
    getSizeOfModules: getSizeOfModules,
    getRootDependencies: getRootDependencies,
    calculateNestedDependencies: calculateNestedDependencies,
};
