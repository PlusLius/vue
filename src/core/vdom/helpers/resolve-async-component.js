/* @flow */

import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol
} from 'core/util/index'

import { createEmptyVNode } from 'core/vdom/vnode'
// 这个函数目的是为了保证能找到异步组件 JS 定义的组件对象，
// 并且如果它是一个普通对象，则调用 Vue.extend 把它转换成一个组件的构造函数。
function ensureCtor (comp: any, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    comp = comp.default // esmodule 拿到该组件的default
  }
  return isObject(comp) //  并且如果它是一个普通对象，
    ? base.extend(comp) // 则调用 Vue.extend 把它转换成一个组件的构造函数。
    : comp // 否则使用es.default组件
}
// 创建异步组件占位符
// 果是第一次执行 resolveAsyncComponent，除非使用高级异步组件 0 delay 去创建了一个 loading 组件
// 否则返回是 undefiend，接着通过 createAsyncPlaceholder 创建一个注释节点作为占位符。
export function createAsyncPlaceholder (
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  // 实际上就是就是创建了一个占位的注释 VNode，
  const node = createEmptyVNode()
  // 同时把 asyncFactory 和 asyncMeta 赋值给当前 vnode。
  node.asyncFactory = factory
  node.asyncMeta = { data, context, children, tag }
  // 当执行 forceRender 的时候，会触发组件的重新渲染，那么会再一次执行 resolveAsyncComponent，这时候就会根据不同的情况，可
  // 能返回 loading、error 或成功加载的异步组件，返回值不为 undefined，因此就走正常的组件 render、patch 过程，
  // 与组件第一次渲染流程不一样，这个时候是存在新旧 vnode 的
  return node
}

// 解析异步组件
// 1. Promise异步组件
// Vue.component(
//   'async-webpack-example',
//   // 该 `import` 函数返回一个 `Promise` 对象。
//   () => import('./my-async-component')
// )

// 2. 高级异步组件
// const AsyncComp = () => ({
//   // 需要加载的组件。应当是一个 Promise
//   component: import('./MyComp.vue'),
//   // 加载中应当渲染的组件
//   loading: LoadingComp,
//   // 出错时渲染的组件
//   error: ErrorComp,
//   // 渲染加载中组件前的等待时间。默认：200ms。
//   delay: 200,
//   // 最长等待时间。超出此时间则渲染错误组件。默认：Infinity
//   timeout: 3000
// })
// Vue.component('async-example', AsyncComp)

// 3. 普通异步组件
// Vue.component('async-example', function (resolve, reject) {
//    // 这个特殊的 require 语法告诉 webpack
//    // 自动将编译后的代码分割成不同的块，
//    // 这些块将通过 Ajax 请求自动下载。
//    require(['./my-async-component'], resolve)
// })
export function resolveAsyncComponent (
  factory: Function,
  baseCtor: Class<Component>,
  context: Component
): Class<Component> | void {
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }

  if (isDef(factory.resolved)) {
    return factory.resolved
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  if (isDef(factory.contexts)) {
    // already pending
    factory.contexts.push(context)
  } else {
    // 它会遍历 factory.contexts，拿到每一个调用异步组件的实例 vm,
    const contexts = factory.contexts = [context]
    let sync = true

    const forceRender = () => {
      //resolve 逻辑最后判断了 sync，显然我们这个场景下 sync 为 false，那么就会执行 forceRender 函数，
      // 它会遍历 factory.contexts，拿到每一个调用异步组件的实例 vm, 执行 vm.$forceUpdate() 方法
      for (let i = 0, l = contexts.length; i < l; i++) {
        // 执行 vm.$forceUpdate() 方法
        // $forceUpdate 的逻辑非常简单，就是调用渲染 watcher 的 update 方法，
        // 让渲染 watcher 对应的回调函数执行，也就是触发了组件的重新渲染。
        // 之所以这么做是因为 Vue 通常是数据驱动视图重新渲染，
        // 但是在整个异步组件加载过程中是没有数据发生变化的，
        // 所以通过执行 $forceUpdate 可以强制组件重新渲染一次。
        contexts[i].$forceUpdate()
      }
    }
    // 利用once方法保证方法只调用一次
    const resolve = once((res: Object | Class<Component>) => {
      // cache resolved
      // 异步完成后，修改resolved状态
      factory.resolved = ensureCtor(res, baseCtor)
      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      if (!sync) {
        // 更新完成后，调用强制更新方法更新视图
        forceRender()
      }
    })
    // 利用once方法保证方法只调用一次
    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender()
      }
    })
    // 这块儿就是执行我们组件的工厂函数，同时把 resolve 和 reject 函数作为参数传入
    // 组件的工厂函数通常会先发送请求去加载我们的异步组件的 JS 文件，拿到组件定义的对象 res 后，
    // 执行 resolve(res) 逻辑，它会先执行 factory.resolved = ensureCtor(res, baseCtor)：
    const res = factory(resolve, reject)

    if (isObject(res)) {
      // 处理promise异步组件
      if (typeof res.then === 'function') {
        // () => Promise
        if (isUndef(factory.resolved)) { // 检查是否已经resolved
          res.then(resolve, reject)
        }
      } else if (isDef(res.component) && typeof res.component.then === 'function') { // 处理高级异步组件
        res.component.then(resolve, reject)

        if (isDef(res.error)) { // 检查是否定义了error
          // 拿到err组件对象
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        if (isDef(res.loading)) {// 检查是否定义了loading
          // 拿到loading组件对象
          factory.loadingComp = ensureCtor(res.loading, baseCtor)
          // 设置了loading, 设置delay时间，默认为200ms延迟
          if (res.delay === 0) {
            factory.loading = true
          } else {
            setTimeout(() => {
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender()
              }
            }, res.delay || 200)
          }
        }

        if (isDef(res.timeout)) { // 如果定义了timeout
          setTimeout(() => {
            // 超时的情况，直接调用reject
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    sync = false
    // return in case resolved synchronously
    // 如果loading马上打开了，就是loading组件
    // 否则则使用已经加载好的组件
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}
