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
  // $flow-disable-line
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  for (const key in computed) {
    const userDef = computed[key]
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
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}
//定义computed
export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : userDef
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
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
function createComputedGetter (key) {
  return function computedGetter () {
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
}
