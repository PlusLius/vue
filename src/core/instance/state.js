/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,//响应式设置一个属性的值
  del,//响应式删除一个属性的值
  observe,//observe用来观察对象的变化
  defineReactive,//给一个对象定义响应式属性
  toggleObserving//用来开启关闭组件观察状态的方法
} from '../observer/index'

import {
  warn,
  bind,//raw bind
  noop,//空方法
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

//代理data
//proxy 方法的实现很简单，通过 Object.defineProperty 把 target[sourceKey][key] 的读写变成了对 target[key] 的读写。
//所以对于 props 而言，对 vm._props.xxx 的读写变成了 vm.xxx 的读写，而对于 vm._props.xxx 我们可以访问到定义在 props 中的属性，
//所以我们就可以通过 vm.xxx 访问到定义在 props 中的 xxx 属性了。同理，对于 data 而言，对 vm._data.xxxx 的读写变成了对 vm.xxxx 的读写，
//而对于 vm._data.xxxx 我们可以访问到定义在 data 函数返回对象中的属性，所以我们就可以通过 vm.xxxx 访问到定义在 data 函数返回对象中的 xxxx 属性了。
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
//初始化state -> props.methpds...
// initState 方法主要是对 props、methods、data、computed 和 wathcer 等属性做了初始化操作。这里我们重点分析 props 和 data，
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  //如果能够拿到props/methods/data/computed/watch进行对应的初始化
  if (opts.props) initProps(vm, opts.props)
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    //初始化data
    initData(vm)
  } else {
    //添加观察者，观察vm._data的一个空对象的变化
    observe(vm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(vm, opts.computed)
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}
//初始化options.props
//props 的初始化主要过程，就是遍历定义的 props 配置。遍历的过程主要做两件事情：
//一个是调用 defineReactive 方法把每个 prop 对应的值变成响应式，可以通过 vm._props.xxx 访问到定义 props 中对应的属性。
function initProps (vm: Component, propsOptions: Object) {
  //拿到props数据
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  //根实例属性应该被转换
  if (!isRoot) {
    //关闭组件的observer
    toggleObserving(false)
  }
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      //定义props的响应式属性
      defineReactive(props, key, value, () => {
        if (vm.$parent && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
        //定义props的响应式属性
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    //静态属性已经在在vue.extend()期间代理在组件的原型上，,我们只需要代理在实例化时定义的props
        proxy(vm, `_props`, key)
    }
  }
  //开启响应监听
  toggleObserving(true)
}

//初始化options.data
//data 的初始化主要过程也是做两件事，一个是对定义 data 函数返回对象的遍历，通过 proxy 把每一个值 vm._data.xxx 都代理到
//vm.xxx 上；另一个是调用 observe 方法观测整个 data 的变化，把 data 也变成响应式，可以通过 vm._data.xxx 访问到定义 data 返回函数中对应的属性，
function initData (vm: Component) {
  //拿到用户传入的data
  let data = vm.$options.data
  //拿到执行完工厂函数的结果
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  if (!isPlainObject(data)) {
    /** 
     * new Vue({
        data () {
          return '我就是不返回对象'
        }
      })
    */
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  //拿到所以的keys
  const keys = Object.keys(data)
  //拿到props
  const props = vm.$options.props
  //拿到methods
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        /** 
         * const ins = new Vue({
              data: {
                a: 1
              },
              methods: {
                b () {}
              }
            })

            ins.a   // 1
            ins.b // function
        */
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      //如果props和key重名了报错
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
      //保证key不是保留关键字
    } else if (!isReserved(key)) {
      //代码data中的每一个key到_data
      proxy(vm, `_data`, key)
    }
  }
  // observe data
  // 添加观察者
  observe(data, true /* asRootData */)
}
//拿到用户传入的data对象
export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    //返回工厂函数的执行结果
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { computed: true }
//初始化computed
function initComputed (vm: Component, computed: Object) {
//   函数首先创建 vm._computedWatchers 为一个空对象，接着对 computed 对象做遍历，拿到计算属性的每一个 userDef，
//   然后尝试获取这个 userDef 对应的 getter 函数，拿不到则在开发环境下报警告。
//   接下来为每一个 getter 创建一个 watcher，这个 watcher 和渲染 watcher 有一点很大的不同，
//   它是一个 computed watcher，因为 const computedWatcherOptions = { computed: true }。
//   computed watcher 和普通 watcher 的差别我稍后会介绍。最后对判断如果 key 不是 vm 的属性，
//   则调用 defineComputed(vm, key, userDef)，否则判断计算属性对于的 key 是否已经被 data 或者 prop 所占用，如果是的话则在开发环境报相应的警告。
  // $flow-disable-line
//   函数首先创建 vm._computedWatchers 为一个空对象，接着对 computed 对象做遍历，拿到计算属性的每一个 userDef，
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  for (const key in computed) {
//     然后尝试获取这个 userDef 对应的 getter 函数，拿不到则在开发环境下报警告。
    const userDef = computed[key]
//     拿不到则在开发环境下报警告。
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    //组件定义的computed属性已经在组件原型上定义，我们只需要定义在实例化时定义的计算属性
    if (!(key in vm)) {
      //定义computed
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
//        则调用 defineComputed(vm, key, userDef)，否则判断计算属性对于的 key 是否已经被 data 或者 prop 所占用，如果是的话则在开发环境报相应的警告。
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}
//定义computed
// 这段逻辑很简单，其实就是利用 Object.defineProperty 给计算属性对应的 key 值添加 getter 和 setter，setter 通常是计算属性是一个对象，
// 并且拥有 set 方法的时候才有，否则是一个空函数。在平时的开发场景中，计算属性有 setter 的情况比较少，我们重点关注一下 getter 部分，
export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
//     其实就是利用 Object.defineProperty 给计算属性对应的 key 值添加 getter 和 setter，setter 通常是计算属性是一个对象
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key) // 接下来为每一个 getter 创建一个 watcher，这个 watcher 和渲染 watcher 有一点很大的不同，
      : userDef
    sharedPropertyDefinition.set = noop //  并且拥有 set 方法的时候才有，否则是一个空函数
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key) // 接下来为每一个 getter 创建一个 watcher，这个 watcher 和渲染 watcher 有一点很大的不同，
        : userDef.get
      : noop
    sharedPropertyDefinition.set = userDef.set
      ? userDef.set
      : noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  //给computed设置响应式属性
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
//定义computedGetter
// 接下来为每一个 getter 创建一个 watcher，这个 watcher 和渲染 watcher 有一点很大的不同，
function createComputedGetter (key) {
  return function computedGetter () {
//      它是一个 computed watcher，因为 const computedWatcherOptions = { computed: true }。
    const watcher = this._computedWatchers && this._computedWatchers[key]
    //如果存在computed watcher
    if (watcher) {
      //调用watcher.depend()方法
      watcher.depend()
      //返回watcher.evaluate的执行结果
      return watcher.evaluate()
    }
  }
}

//初始化options.methods
function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (methods[key] == null) {
        warn(
          `Method "${key}" has an undefined value in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    //挂载方法到vm上,将this指向vm
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm)
  }
}
//初始化options.watch
// 这里就是对 watch 对象做遍历，拿到每一个 handler，因为 Vue 是支持 watch 的同一个 key 对应多个 handler
// ，所以如果 handler 是一个数组，则遍历这个数组，调用 createWatcher 方法，否则直接调用 createWatcher：
function initWatch (vm: Component, watch: Object) {
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}
//创建watch
// 这里的逻辑也很简单，首先对 hanlder 的类型做判断，拿到它最终的回调函数，
// 最后调用 vm.$watch(keyOrFn, handler, options) 函数，
// $watch 是 Vue 原型上的方法，它是在执行 stateMixin 的时候定义的：
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
  //找到vm下的处理方法在进行watch
  return vm.$watch(expOrFn, handler, options)
}
//往原型上混入一些方法
export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function (newData: Object) {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  //挂载$data,$props为响应属性
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)
  //挂载$set,$delete 为Observer中的set和del
  Vue.prototype.$set = set
  Vue.prototype.$delete = del
  //挂载$watch，用来创建watcher，给开发者使用的
//   也就是说，侦听属性 watch 最终会调用 $watch 方法，这个方法首先判断 cb 如果是一个对象，
//   则调用 createWatcher 方法，这是因为 $watch 方法是用户可以直接调用的，它可以传递一个对象，也可以传递函数。
//   接着执行 const watcher = new Watcher(vm, expOrFn, cb, options) 实例化了一个 watcher，
//   这里需要注意一点这是一个 user watcher，因为 options.user = true。通过实例化 watcher 的方式，
//   一旦我们 watch 的数据发送变化，它最终会执行 watcher 的 run 方法，执行回调函数 cb，并且如果我们设置了 immediate 为 true，
//   则直接会执行回调函数 cb。最后返回了一个 unwatchFn 方法，它会调用 teardown 方法去移除这个 watcher。
// 所以本质上侦听属性也是基于 Watcher 实现的，它是一个 user watcher。其实 Watcher 支持了不同的类型，下面我们梳理一下它有哪些类型以及它们的作用
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
//     里需要注意一点这是一个 user watcher，因为 options.user = true。通过实例化 watcher 的方式，
    options.user = true
    //初始化watcher对象
    //观察 Vue 实例变化的一个表达式或计算属性函数。
    //回调函数得到的参数为新值和旧值。
    //表达式只接受监督的键路径。对于更复杂的表达式，
    //用一个函数取代。
    const watcher = new Watcher(vm, expOrFn, cb, options)
    //       一旦我们 watch 的数据发送变化，它最终会执行 watcher 的 run 方法，执行回调函数 cb，并且如果我们设置了 immediate 为 true，
//        则直接会执行回调函数 cb。
    if (options.immediate) {
      // vm.$watch('a', callback, {
      //   immediate: true
      // })
      // 立即以 `a` 的当前值触发回调
      cb.call(vm, watcher.value)
    }
    //返回卸载方法
//   最后返回了一个 unwatchFn 方法，它会调用 teardown 方法去移除这个 watcher。
//     所以本质上侦听属性也是基于 Watcher 实现的，它是一个 user watcher。其实 Watcher 支持了不同的类型，下面我们梳理一下它有哪些类型以及它们的作用。

    return function unwatchFn () {
      watcher.teardown()
    }
  }
}
