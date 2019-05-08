# vue
vue源码学习

## 编译过程
Runtime Only
我们在使用 Runtime Only 版本的 Vue.js 的时候，通常需要借助如 webpack 的 vue-loader 工具把 .vue 文件编译成 JavaScript，因为是在编译阶段做的，所以它只包含运行时的 Vue.js 代码，因此代码体积也会更轻量。

Runtime + Compiler
我们如果没有对代码做预编译，但又使用了 Vue 的 template 属性并传入一个字符串，则需要在客户端编译模板，如下所示：

```js
// 需要编译器的版本
new Vue({
  template: '<div>{{ hi }}</div>'
})

// 这种情况不需要
new Vue({
  render (h) {
    return h('div', this.hi)
  }
})
```

## Vue构造函数原型

```js
// initMixin(Vue)    src/core/instance/init.js **************************************************
Vue.prototype._init = function (options?: Object) {}

// stateMixin(Vue)    src/core/instance/state.js **************************************************
Vue.prototype.$data
Vue.prototype.$props
Vue.prototype.$set = set
Vue.prototype.$delete = del
Vue.prototype.$watch = function (
  expOrFn: string | Function,
  cb: any,
  options?: Object
): Function {}

// eventsMixin(Vue)    src/core/instance/events.js **************************************************
Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {}
Vue.prototype.$once = function (event: string, fn: Function): Component {}
Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {}
Vue.prototype.$emit = function (event: string): Component {}

// lifecycleMixin(Vue)    src/core/instance/lifecycle.js **************************************************
Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {}
Vue.prototype.$forceUpdate = function () {}
Vue.prototype.$destroy = function () {}

// renderMixin(Vue)    src/core/instance/render.js **************************************************
// installRenderHelpers 函数中
Vue.prototype._o = markOnce
Vue.prototype._n = toNumber
Vue.prototype._s = toString
Vue.prototype._l = renderList
Vue.prototype._t = renderSlot
Vue.prototype._q = looseEqual
Vue.prototype._i = looseIndexOf
Vue.prototype._m = renderStatic
Vue.prototype._f = resolveFilter
Vue.prototype._k = checkKeyCodes
Vue.prototype._b = bindObjectProps
Vue.prototype._v = createTextVNode
Vue.prototype._e = createEmptyVNode
Vue.prototype._u = resolveScopedSlots
Vue.prototype._g = bindObjectListeners
Vue.prototype.$nextTick = function (fn: Function) {}
Vue.prototype._render = function (): VNode {}

// core/index.js 文件中
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

// 在 runtime/index.js 文件中
Vue.prototype.__patch__ = inBrowser ? patch : noop
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}

// 在入口文件 entry-runtime-with-compiler.js 中重写了 Vue.prototype.$mount 方法
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // ... 函数体
}

```

## Vue静态方法

```js
// initGlobalAPI
Vue.config
Vue.util = {
	warn,
	extend,
	mergeOptions,
	defineReactive
}
Vue.set = set
Vue.delete = del
Vue.nextTick = nextTick
Vue.options = {
	components: {
		KeepAlive
		// Transition 和 TransitionGroup 组件在 runtime/index.js 文件中被添加
		// Transition,
    	// TransitionGroup
	},
	directives: Object.create(null),
	// 在 runtime/index.js 文件中，为 directives 添加了两个平台化的指令 model 和 show
	// directives:{
	//	model,
    //	show
	// },
	filters: Object.create(null),
	_base: Vue
}

// initUse ***************** global-api/use.js
Vue.use = function (plugin: Function | Object) {}

// initMixin ***************** global-api/mixin.js
Vue.mixin = function (mixin: Object) {}

// initExtend ***************** global-api/extend.js
Vue.cid = 0
Vue.extend = function (extendOptions: Object): Function {}

// initAssetRegisters ***************** global-api/assets.js
Vue.component =
Vue.directive =
Vue.filter = function (
  id: string,
  definition: Function | Object
): Function | Object | void {}

// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

Vue.version = '__VERSION__'

// entry-runtime-with-compiler.js
Vue.compile = compileToFunctions
```

## Vue实例私有方法

```js
// Vue.prototype._init
vm._uid = uid++     // 每个Vue实例都拥有一个唯一的 id
vm._isVue = true    // 这个表示用于避免Vue实例对象被观测(observed)
vm.$options         // 当前 Vue 实例的初始化选项，注意：这是经过 mergeOptions() 后的
vm._renderProxy = vm    // 渲染函数作用域代理
vm._self = vm       // 实例本身

// initLifecycle(vm)    src/core/instance/lifecycle.js **************************************************
vm.$parent = parent
vm.$root = parent ? parent.$root : vm

vm.$children = []
vm.$refs = {}

vm._watcher = null
vm._inactive = null
vm._directInactive = false
vm._isMounted = false
vm._isDestroyed = false
vm._isBeingDestroyed = false

// initEvents(vm)   src/core/instance/events.js **************************************************
vm._events = Object.create(null)
vm._hasHookEvent = false

// initRender(vm)   src/core/instance/render.js **************************************************
vm._vnode = null // the root of the child tree
vm._staticTrees = null // v-once cached trees

vm.$vnode
vm.$slots
vm.$scopedSlots

vm._c
vm.$createElement

vm.$attrs
vm.$listeners

// initState(vm)   src/core/instance/state.js **************************************************
vm._watchers = []
vm._data

// mountComponent()   src/core/instance/lifecycle.js
vm.$el

// initComputed()   src/core/instance/state.js
vm._computedWatchers = Object.create(null)

// initProps()    src/core/instance/state.js
vm._props = {}

// initProvide()    src/core/instance/inject.js
vm._provided
```
## vm.$watch

```js

// 键路径
vm.$watch('a.b.c', function (newVal, oldVal) {
  // 做点什么
})

// 函数
vm.$watch(
  function () {
    // 表达式 `this.a + this.b` 每次得出一个不同的结果时
    // 处理函数都会被调用。
    // 这就像监听一个未被定义的计算属性
    return this.a + this.b
  },
  function (newVal, oldVal) {
    // 做点什么
  }
)

var unwatch = vm.$watch('a', cb)
// 之后取消观察
unwatch()

vm.$watch('someObject', callback, {
  deep: true
})
vm.someObject.nestedValue = 123
// callback is fired

vm.$watch('a', callback, {
  immediate: true
})
// 立即以 `a` 的当前值触发回调
```

```js
//instance/state.js
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  //找到表达式往下执行
  return vm.$watch(expOrFn, handler, options)
}

//挂载$watch，用来创建watcher，给开发者使用的
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
     //如果传入的是普通对象，先找到对象的表达式在往下执行
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    // vm.$watch('someObject', callback, {
    //   deep: true
    // })
    // vm.someObject.nestedValue = 123
    // // callback is fired
    options = options || {}
    options.user = true
    //初始化watcher对象
    //观察 Vue 实例变化的一个表达式或计算属性函数。
    //回调函数得到的参数为新值和旧值。
    //表达式只接受监督的键路径。对于更复杂的表达式，
    //用一个函数取代。
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      // vm.$watch('a', callback, {
      //   immediate: true
      // })
      // 立即以 `a` 的当前值触发回调
      cb.call(vm, watcher.value)
    }
    //返回卸载方法
    return function unwatchFn () {
      watcher.teardown()
    }
  }
```

## vm事件

```js
//instance/events.js
//挂载事件
Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
Vue.prototype.$once = function (event: string, fn: Function): Component {
Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
Vue.prototype.$emit = function (event: string): Component {
//钩子检测
const hookRE = /^hook:/

```

```js
 const hookRE = /^hook:/
  //监听当前实例上的自定义事件。事件可以由vm.$emit触发。回调函数会接收所有传入事件触发函数的额外参数。
  /** 
   * vm.$on('test', function (msg) {
        console.log(msg)
      })
      vm.$emit('test', 'hi')
    // => "hi"
  */
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    if (Array.isArray(event)) {
      //如果是数组一个一个绑定
      for (let i = 0, l = event.length; i < l; i++) {
        this.$on(event[i], fn)
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      //移除事件
      vm.$off(event, on)
      //执行$once给定的回调
      fn.apply(vm, arguments)
    }
    on.fn = fn
    vm.$on(event, on)
    return vm
  }

  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        this.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    if (fn) {
      // specific handler
      let cb
      let i = cbs.length
      while (i--) {
        cb = cbs[i]
        if (cb === fn || cb.fn === fn) {
          cbs.splice(i, 1)
          break
        }
      }
    }
    return vm
  }

  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      for (let i = 0, l = cbs.length; i < l; i++) {
        try {
          cbs[i].apply(vm, args)
        } catch (e) {
          handleError(e, vm, `event handler for "${event}"`)
        }
      }
    }
    return vm
  }
```

## lifecycle

```js
//instance/lifecycle
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
  Vue.prototype.$forceUpdate = function () {
  Vue.prototype.$destroy = function () {
```

## render

```js
//instance/render
  installRenderHelpers(Vue.prototype)
  Vue.prototype.$nextTick = function (fn: Function) {
  Vue.prototype._render = function (): VNode {

```

```js
//instance/render-helpers
function installRenderHelpers (target: any) {
  target._o = markOnce
  target._n = toNumber
  target._s = toString
  target._l = renderList
  target._t = renderSlot
  target._q = looseEqual
  target._i = looseIndexOf
  target._m = renderStatic
  target._f = resolveFilter
  target._k = checkKeyCodes
  target._b = bindObjectProps
  target._v = createTextVNode
  target._e = createEmptyVNode
  target._u = resolveScopedSlots
  target._g = bindObjectListeners
}

```

## globalAPI

```js
/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

//初始化Vue实例的全局方法
export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  //添加config属性
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  //提供了一些util方法
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  Vue.options = Object.create(null)
  /**
   * export const ASSET_TYPES = [
        'component',
        'directive',
        'filter'
      ]
   */
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  /**
   * 
      Vue.options = {
        components: Object.create(null),
        directives: Object.create(null),
        filters: Object.create(null),
        _base: Vue
      }
   */
  Vue.options._base = Vue
  /**
   * Vue.options = {
        components: {
          KeepAlive
        },
        directives: Object.create(null),
        filters: Object.create(null),
        _base: Vue
     }
   */
  extend(Vue.options.components, builtInComponents)
  
  //Vue.use,Vue.mixin,Vue.Extend,Vue[assert]
  initUse(Vue)
  initMixin(Vue)
  initExtend(Vue)
  initAssetRegisters(Vue)
}


```

# 跨平台内置组件和指令


## web/runtime/vue

```js
/* @flow */

//vue core代码
import Vue from 'core/index'
//默认配置
import config from 'core/config'
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser, isChrome } from 'core/util/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
import platformDirectives from './directives/index'
import platformComponents from './components/index'

// install platform specific utils
//覆盖默认导出的对象
Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag
Vue.config.isReservedAttr = isReservedAttr
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

// install platform runtime directives & components
// 将平台相关指令混入到vue.options中
/**
 * Vue.options = {
    components: {
      KeepAlive,
      Transition,
      TransitionGroup
    },
    directives: {
      model,
      show
    },
    filters: Object.create(null),
    _base: Vue
  }
 */
extend(Vue.options.directives, platformDirectives)
extend(Vue.options.components, platformComponents)

// install platform patch function
// 虚拟dom进行patch比较
Vue.prototype.__patch__ = inBrowser ? patch : noop

// public mount method
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  //$mount调用mountComponent进行挂载
  return mountComponent(this, el, hydrating)
}

// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Vue)
      } else if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test' &&
        isChrome
      ) {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        )
      }
    }
    if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` +
        `Make sure to turn on production mode when deploying for production.\n` +
        `See more tips at https://vuejs.org/guide/deployment.html`
      )
    }
  }, 0)
}

export default Vue

```

## runtime 与 runtime-with-compiler的区别

```js
//entry-runtime
/* @flow */

import Vue from './runtime/index'

export default Vue

//entry-runtime-with-compiler
Vue.compile = compileToFunctions

export default Vue

```