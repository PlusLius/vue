/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0
//Vue 初始化主要就干了几件事情，合并配置，初始化生命周期，初始化事件中心，初始化渲染，初始化 data、props、computed、watcher 等等。
export function initMixin (Vue: Class<Component>) {
  //往构造函数中添加init方法
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
//     这里首先是合并 options 的过程有变化，_isComponent 为 true，
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
//       所以走到了 initInternalComponent 过程
      initInternalComponent(vm, options)
    } else {
      /**
       * vm.$options = mergeOptions(
            // resolveConstructorOptions(vm.constructor)
            {
              components: {
                KeepAlive
                Transition,
                TransitionGroup
              },
              directives:{
                model,
                show
              },
              filters: Object.create(null),
              _base: Vue
            },
            // options || {}
            {
              el: '#app',
              data: {
                test: 1
              }
            },
            vm
          )
       */
      // vm实例上存的就是内置options与用户options规范化后合并的一个结果
      vm.$options = mergeOptions(
        //解析vm.contructor.options
        resolveConstructorOptions(vm.constructor),
        options || {},// {  用户传入的options
                      //   el: '#app',
                      //   data: {
                      //     test: 1
                      //   }
                      // }
        vm // vm实例
      )
      //vm.$options拿到规范化父子options合并后的一个options
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm) //  vm._renderProxy = vm 对当前对象做一层代理
    } else {
      vm._renderProxy = vm
    }
    // expose real self 给实例标记自己
    vm._self = vm
    // 初始化生命周期在初始化vue实例阶段
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate') // beforeCreate 的钩子函数中就不能获取到 props、data 中定义的值，也不能调用 methods 中定义的函数。
    initInjections(vm) // resolve injections before data/props
    initState(vm) //initState 的作用是初始化 props、data、methods、watch、computed 等属性
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')// 在这俩个钩子函数执行的时候，并没有渲染 DOM，所以我们也不能够访问 DOM

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

// 创建子组件时调用
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
//   opts.parent = options.parent、opts._parentVnode = parentVnode，
//   它们是把之前我们通过 createComponentInstanceForVnode 函数传入的几个参数合并到内部的选项 $options 里了。
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
//   这里拿到了父组件传入的 listeners，然后在执行 initEvents 的过程中，会处理这个 listeners
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}
// 解析构造函数的options,vm.constructor
// Vue.options = {
// 	components: {
// 		KeepAlive
// 		Transition,
//     	TransitionGroup
// 	},
// 	directives:{
// 	    model,
//         show
// 	},
// 	filters: Object.create(null),
// 	_base: Vue
// }
export function resolveConstructorOptions (Ctor: Class<Component>) {
  //拿到vm.constructor.optisons
  let options = Ctor.options
  //判断是不是子类
  // const Sub = Vue.extend()
  // const s = new Sub()
  // console.log(Sub.super)  // Vue 只有子类才能拿到super
  if (Ctor.super) {
    //拿到父类options,通过递归去拿父类的options
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 缓存当前vm实例的contructor父类的options
    const cachedSuperOptions = Ctor.superOptions
    // 父options与之前父options不一致时
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      // 记录父级更改过的options
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      // 该了options之后拿到改了的options
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      // 更新改了的options
      if (modifiedOptions) {
        // 将改了的options混入到extendOptions
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 合并options
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        // 给当前组件记录对应的constructor
        options.components[options.name] = Ctor
      }
    }
  }
  //返回Vue.options 就是拿到Vue.options，返回父类的options
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options // 当前的options
  const extended = Ctor.extendOptions // extendOptions
  const sealed = Ctor.sealedOptions // 
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = dedupe(latest[key], extended[key], sealed[key])
    }
  }
  return modified
}
// 删除重复数据
function dedupe (latest, extended, sealed) {
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  if (Array.isArray(latest)) {
    const res = []
    sealed = Array.isArray(sealed) ? sealed : [sealed]
    extended = Array.isArray(extended) ? extended : [extended]
    for (let i = 0; i < latest.length; i++) {
      // push original options and not sealed options to exclude duplicated options
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i])
      }
    }
    return res
  } else {
    return latest
  }
}
