/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import { mark, measure } from '../util/perf'
import { createEmptyVNode } from '../vdom/vnode'
import { updateComponentListeners } from './events'
import { resolveSlots } from './render-helpers/resolve-slots'
import { toggleObserving } from '../observer/index'
import { pushTarget, popTarget } from '../observer/dep'

import {
  warn,
  noop,
  remove,
  handleError,
  emptyObject,
  validateProp
} from '../util/index'

export let activeInstance: any = null
export let isUpdatingChildComponent: boolean = false

export function initLifecycle (vm: Component) {
  const options = vm.$options

  // locate first non-abstract parent
//     可以看到 vm.$parent 就是用来保留当前 vm 的父实例，
  let parent = options.parent
//   ，并且通过 parent.$children.push(vm) 来把当前的 vm 存储到父实例的 $children 中。
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    parent.$children.push(vm)
  }
//   可以看到 vm.$parent 就是用来保留当前 vm 的父实例，
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
}

export function lifecycleMixin (Vue: Class<Component>) {
// Vue 的 _update 是实例的一个私有方法，它被调用的时机有 2 个，一个是首次渲染，一个是数据更新的时候；
// _update 方法的作用是把 VNode 渲染成真实的 DOM
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const prevActiveInstance = activeInstance
    activeInstance = vm
//     首先 vm._vnode = vnode 的逻辑，这个 vnode 是通过 vm._render() 返回的组件渲染 VNode
//     vm._vnode 和 vm.$vnode 的关系就是一种父子关系，用代码表达就是 vm._vnode.parent === vm.$vnode
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    // _update 的核心就是调用 vm.__patch__ 方法，这个方法实际上在不同的平台，比如 web 和 weex 上的定义是不一样的，
    // Vue.prototype.__patch__ = inBrowser ? patch : noop
    // 可以看到，甚至在 web 平台上，是否是服务端渲染也会对这个方法产生影响。因为在服务端渲染中，
    // 没有真实的浏览器 DOM 环境，所以不需要把 VNode 最终转换成 DOM，因此是一个空函数，而在浏览器端渲染中，它指向了 patch 方法
//     import * as nodeOps from 'web/runtime/node-ops'
//     import { createPatchFunction } from 'core/vdom/patch'
//     import baseModules from 'core/vdom/modules/index'
//     import platformModules from 'web/runtime/modules/index'

//     // the directive module should be applied last, after all
//     // built-in modules have been applied.
//     const modules = platformModules.concat(baseModules)
 
//     export const patch: Function = createPatchFunction({ nodeOps, modules })
//     该方法的定义是调用 createPatchFunction 方法的返回值，这里传入了一个对象，包含 nodeOps 参数和 modules 参数。
//     其中，nodeOps 封装了一系列 DOM 操作的方法，modules 定义了一些模块的钩子函数的实现，
    if (!prevVnode) {
      // initial render
      // 首次渲染
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates
      // 数据更新时渲染
//       在 vm._update 的过程中，把当前的 vm 赋值给 activeInstance，
//       同时通过 const prevActiveInstance = activeInstance 用 prevActiveInstance 保留上一次的 activeInstance。
//       实际上，prevActiveInstance 和当前的 vm 是一个父子关系，当一个 vm 实例完成它的所有子树的 patch 或者 update 过程后，
//       activeInstance 会回到它的父实例，这样就完美地保证了 createComponentInstanceForVnode 整个深度遍历过程中，
//       我们在实例化子组件的时候能传入当前子组件的父 Vue 实例，并在 _init 的过程中，通过 vm.$parent 把这个父子关系保
//       负责渲染成 DOM 的函数是 createElm，注意这里我们只传了 2 个参数，所以对应的 parentElm 是 undefined
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
//     这个 activeInstance 作用就是保持当前上下文的 Vue 实例，它是在 lifecycle 模块的全局变量，
//     定义是 export let activeInstance: any = null，
//     并且在之前我们调用 createComponentInstanceForVnode 方法的时候从 lifecycle 模块获取，
//     并且作为参数传入的。因为实际上 JavaScript 是一个单线程，Vue 整个初始化是一个深度遍历的过程，
//     在实例化子组件的过程中，它需要知道当前上下文的 Vue 实例是什么，并把它作为子组件的父 Vue 实例。
//     之前我们提到过对子组件的实例化过程先会调用 initInternalComponent(vm, options) 合并 options，把 parent 存储在 vm.$options 中，
//     在 $mount 之前会调用 initLifecycle(vm) 方法
    activeInstance = prevActiveInstance
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }

  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

  Vue.prototype.$destroy = function () {
    const vm: Component = this
    if (vm._isBeingDestroyed) {
      return
    }
    // beforeDestroy 钩子函数的执行时机是在 $destroy 函数执行最开始的地方，接着执行了一系列的销毁动作，
    // 包括从 parent 的 $children 中删掉自身，删除 watcher，当前渲染的 VNode 执行销毁钩子函数等，执行完毕后再调用 destroy 钩子函数。
    callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true
    // remove self from parent
    const parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }
    // teardown watchers
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    let i = vm._watchers.length
    while (i--) {
      vm._watchers[i].teardown()
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // call the last hook...
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    // 在 $destroy 的执行过程中，它又会执行 vm.__patch__(vm._vnode, null) 触发它子组件的销毁钩子函数，
    // 这样一层层的递归调用，所以 destroy 钩子函数执行顺序是先子后父，和 mounted 过程一样。
    vm.__patch__(vm._vnode, null)
    // fire destroyed hook
    callHook(vm, 'destroyed')
    // turn off all instance listeners.
    vm.$off()
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}
// beforeMount 钩子函数发生在 mount，也就是 DOM 挂载之前，它的调用时机是在 mountComponent 函数中
// 挂载组件就是做2个事情，生成虚拟dom,更新成真实dom
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  // 在 vue实例上挂载el,$options上没有render方法报警告
  vm.$el = el
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  // 调用钩子函数
  callHook(vm, 'beforeMount')
   // 将组件更新包装成一个方法
  let updateComponent
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      const vnode = vm._render()
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag)
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    updateComponent = () => {
      // _render生成虚拟dom, _update生成更新后的dom
      vm._update(vm._render(), hydrating)
    }
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined

  //Watcher 在这里起到两个作用，一个是初始化的时候会执行回调函数，另一个是当 vm 实例中的监测的数据发生变化的时候执行回调函数，这块儿我们会在之后的章节中介绍。
  //函数最后判断为根节点的时候设置 vm._isMounted 为 true， 表示这个实例已经挂载了，同时执行 mounted 钩子函数。 这里注意 vm.$vnode 表示 Vue 实例的父虚拟 Node，所以它为 Null 则表示当前是根 Vue 的实例
  // 在组件 mount 的过程中，会实例化一个渲染的 Watcher 去监听 vm 上的数据变化重新渲染，
  new Watcher(vm, updateComponent, noop, {
    before () {
      // 也就是在组件已经 mounted 之后，才会去调用这个钩子函数
      if (vm._isMounted) {
        // beforeUpdate 的执行时机是在渲染 Watcher 的 before 函数中
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  // 手动调用mounted,将自动挂载实例
  // vm.$vnode 如果为 null，则表明这不是一次组件的初始化过程，而是我们通过外部 new Vue 初始化过程。
  // vm.$vnode 表示 Vue 实例的父虚拟 Node，所以它为 Null 则表示当前是根 Vue 的实例
  if (vm.$vnode == null) {
    //  vm._update() 把 VNode patch 到真实 DOM 后，执行 mounted 钩子。
    // 记录是否已经挂载过该实例
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}

export function updateChildComponent (
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren
  const hasChildren = !!(
    renderChildren ||               // has new static slots
    vm.$options._renderChildren ||  // has old static slots
    parentVnode.data.scopedSlots || // has new scoped slots
    vm.$scopedSlots !== emptyObject // has old scoped slots
  )

  vm.$options._parentVnode = parentVnode
  vm.$vnode = parentVnode // update vm's placeholder node without re-render

  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject
  vm.$listeners = listeners || emptyObject

  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false)
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions: any = vm.$options.props // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }

  // update listeners
  listeners = listeners || emptyObject
  const oldListeners = vm.$options._parentListeners
  vm.$options._parentListeners = listeners
  updateComponentListeners(vm, listeners, oldListeners)

  // resolve slots + force update if has children
  if (hasChildren) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false
  }
}

function isInInactiveTree (vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}

export function activateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    callHook(vm, 'activated')
  }
}

export function deactivateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    callHook(vm, 'deactivated')
  }
}

export function callHook (vm: Component, hook: string) {
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget()
  // 调用生命周期也是拿到的$options里面的钩子队列
  const handlers = vm.$options[hook]
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      try {
        // 将钩子方法全部执行
        handlers[i].call(vm)
      } catch (e) {
        handleError(e, vm, `${hook} hook`)
      }
    }
  }
  if (vm._hasHookEvent) {
    // 派发钩子事件
    vm.$emit('hook:' + hook)
  }
  popTarget()
}
