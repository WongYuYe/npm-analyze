const Koa = require('koa')
const app = new Koa()

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

const lib = require('./lib')

app.use(async ctx => {
  ctx.type = 'text/html; charset=utf-8';
  if (ctx.request.url == '/') {
    ctx.body = `<div style='width: 600px; margin: 0 auto; margin-top: 80px'>
      <h1>NPM包下载大小查询</h1>
      <h4>输入个包名</h4>
      <form method="GET" action="/search" id="form">
        <input name="q" value="" style='width: 200px; height: 60px' /><br/>
        <button type="submit" style='margin-top: 20px; width: 100px; height: 40px; font-size: 16px'>查询</button>
      </form>
    </div>`;
  } else if (ctx.request.url.indexOf('/search') > -1) {
    try {
      const res = await fetch(`https://api.npms.io/v2/search/suggestions?q=${ctx.query.q}`).then(res => res.json())
      if (!res.length) {
        ctx.body = `<div style="width: 600px; margin: 0 auto; margin-top: 100px; color: red">
        查询出错，请检查参数-----${ctx.query.q}
        </div>`
        return
      }
      // 取匹配到的第一个值
      const depPackage = res[0].package
      const depObj = {
        "dependencies": {}
      }
      depObj.dependencies[depPackage['name']] = depPackage['version']

      // init
      lib.setup(depObj)

      // get all module size
      var moduleSizes = lib.getSizeOfModules();
      // console.log(moduleSizes)

      let str = `<div style="width: 600px; margin: 0 auto; margin-top: 100px">
      <h1>包名：${ctx.query.q}</h1>
      `
      var sumSize = moduleSizes[ctx.query.q];
      if (moduleSizes) {
        str += `<h3>依赖性项数：${Object.keys(moduleSizes).length}</h3>`
        let table = `
          <h3>明细：</h3>
          <table>`;
        table += `<tr><td>依赖项</td><td>大小</td></tr>`
        table += `<tr><td>${ctx.query.q}</td><td>${sumSize}KB</td></tr>`
        for (const key in moduleSizes) {
          if (key != ctx.query.q) {
            const e = moduleSizes[key];
            sumSize += e;
            let tr = `<tr><td>${key}</td><td>${e}KB</td></tr>`
            table += tr
          }
        }
        table += `</table>`
        str += `<h3>总大小：${sumSize.toFixed(2)}KB</h3>`
        str += table
      } else {
        str += `<h3>依赖性项数：0</h3>`
        str += `<h3>总大小：${sumSize.toFixed(2)}KB</h3>`
      }
      str += `</div>`
      ctx.body = str
    } catch (error) {
      console.log(error)
    }
  } else if (ctx.request.url.indexOf('/result') > -1) {
    ctx.body = '你最帅'
  }
});

app.listen(3011);
console.info(`server is running at 3011`)
