/* @flow */

import VNode from './vnode'
import { resolveConstructorOptions } from 'core/instance/init'
import { queueActivatedComponent } from 'core/observer/scheduler'
import { createFunctionalComponent } from './create-functional-component'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject
} from '../util/index'

import {
  resolveAsyncComponent,
  createAsyncPlaceholder,
  extractPropsFromVNodeData
} from './helpers/index'

import {
  callHook,
  activeInstance,
  updateChildComponent,
  activateChildComponent,
  deactivateChildComponent
} from '../instance/lifecycle'

import {
  isRecyclableComponent,
  renderRecyclableComponentTemplate
} from 'weex/runtime/recycle-list/render-component-template'

// inline hooks to be invoked on component VNodes during patch 
// 组件内部钩子,创建组件的会继承父类实例，调用组件钩子函数，组件实例new Vue这个过程中会继续递归创建其他组件，最终返回一个vnode，然后子组件调用$mount去生成dom
// 在 VNode 执行 patch 的过程中执行相关的钩子函数
const componentVNodeHooks = {
  init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
//   并且在执行 init 钩子函数的时候不会再执行组件的 mount 过程了，
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode // work around flow
//   这也就是被 <keep-alive> 包裹的组件在有缓存的时候就不会在执行组件的 created、mounted 等钩子函数的原因了。
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
//       init 钩子函数执行也很简单，我们先不考虑 keepAlive 的情况，它是通过 createComponentInstanceForVnode 创建一个 Vue 的实例，
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      )
//       ，然后调用 $mount 方法挂载子组件
//       componentVNodeHooks 的 init 钩子函数，在完成实例化的 _init 后，接着会执行 
//       child.$mount(hydrating ? vnode.elm : undefined, hydrating) 。这里 hydrating 为 true 一般是服务端渲染的情况，
//       我们只考虑客户端渲染，所以这里 $mount 相当于执行 child.$mount(undefined, false)，
//       它最终会调用 mountComponent 方法，进而执行 vm._render() 方法：
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  },
// 在父组件重新渲染的最后，会执行 patch 过程，进而执行 patchVnode 函数，
// patchVnode 通常是一个递归过程，当它遇到组件 vnode 的时候，会执行组件更新过程的 prepatch 钩子函数
// 内部会调用 updateChildComponent 方法来更新 props，注意第二个参数就是父组件的 propData，
// 那么为什么 vnode.componentOptions.propsData 就是父组件传递给子组件的 prop 数据呢（这个也同样解释了第一次渲染的 propsData 来源）？
// 原来在组件的 render 过程中，对于组件节点会通过 createComponent 方法来创建组件 vnode
  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
// 当我们从 B 组件再次点击 switch 切换到 A 组件，就会命中缓存渲染。
// 当数据发送变化，在 patch 的过程中会执行 patchVnode 的逻辑，它会对比新旧 vnode 节点
//，甚至对比它们的子节点去做更新逻辑，但是对于组件 vnode 而言，是没有 children 的，那么对于 <keep-alive> 组件而言，如何更新它包裹的内容呢？
//  原来 patchVnode 在做各种 diff 之前，会先执行 prepatch 的钩子函数
    const options = vnode.componentOptions
    const child = vnode.componentInstance = oldVnode.componentInstance
//     内部会调用 updateChildComponent 方法来更新 props，注意第二个参数就是父组件的 propData，
//     prepatch 核心逻辑就是执行 updateChildComponent 方法，
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },
//  组件一旦被 <keep-alive> 缓存，那么再次渲染的时候就不会执行 created、mounted 等钩子函数，
// 但是我们很多业务场景都是希望在我们被缓存的组件再次被渲染的时候做一些事情，好在 Vue 提供了 activated 钩子函数，它的执行时机是 <keep-alive> 包裹的组件渲染的时候，
  insert (vnode: MountedComponentVNode) {
//     在渲染的最后一步，会执行 invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch) 函数执行 vnode 的 insert 钩子函数
    const { context, componentInstance } = vnode
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
      // 每个子组件都是在这个钩子函数中执行 mounted 钩子函数，
      // 同步渲染的子组件而言，mounted 钩子函数的执行顺序也是先子后父。
      callHook(componentInstance, 'mounted')
    }
    if (vnode.data.keepAlive) {
//       这里判断如果是被 <keep-alive> 包裹的组件已经 mounted
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
//         ，那么则执行 queueActivatedComponent(componentInstance) ，
        queueActivatedComponent(componentInstance)
      } else {
//         否则执行 activateChildComponent(componentInstance, true)。
        activateChildComponent(componentInstance, true /* direct */)
      }
    }
  },
// 绍组件生命周期的时候提到 beforeDestroy & destroyed 这两个生命周期钩子函数，它们就是在执行 invokeDestroyHook 过程中，执行了 vnode 的 destory 钩子函数
  destroy (vnode: MountedComponentVNode) {
    const { componentInstance } = vnode
//     当组件并不是 keepAlive 的时候，会执行 componentInstance.$destroy() 方法，然后就会执行 beforeDestroy & destroyed 两个钩子函数。
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy()
      } else {
        deactivateChildComponent(componentInstance, true /* direct */)
      }
    }
  }
}

const hooksToMerge = Object.keys(componentVNodeHooks)

// 创建组件返回vnode
// 针对组件渲染这个 case 主要就 3 个关键步骤：
// 构造子类构造函数
// ，安装组件钩子函数
// 和实例化 vnode
export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  if (isUndef(Ctor)) {
    return
  }
  //   Vue.options._base = Vue
  // baseCtor = Vue
  const baseCtor = context.$options._base

  // plain options object: turn it into a constructor
  if (isObject(Ctor)) {
//     import HelloWorld from './components/HelloWorld'

//       export default {
//         name: 'app',
//         components: {
//           HelloWorld
//         }
//       }
//     Ctor = {
//       name: 'app',
//       components: {
//         HelloWorld
//       }
//     }
    // Ctor = Vue.extend(Ctor)
    
//   vm.$options = mergeOptions(
//   resolveConstructorOptions(vm.constructor),
//   options || {},
//   vm)
    
    
//   这样就把 Vue 上的一些 option 扩展到了 vm.$options 上，所以我们也就能通过 vm.$options._base 拿到 Vue 这个构造函数了。
//   mergeOptions 现在只需要理解它的功能是把 Vue 构造函数的 options 和用户传入的 options 做一层合并，到 vm.$options 上。
//   Sub 继续 Vue这个类
//   Ctor = Sub子类
    Ctor = baseCtor.extend(Ctor)
  }

  // if at this stage it's not a constructor or an async component factory,
  // reject.
// 如果不是子类构造函数报错
  if (typeof Ctor !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      warn(`Invalid Component definition: ${String(Ctor)}`, context)
    }
    return
  }

  // async component
  let asyncFactory
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor, context)
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }

  data = data || {}

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  resolveConstructorOptions(Ctor)

  // transform component v-model data into props & events
  if (isDef(data.model)) {
    transformModel(Ctor.options, data)
  }

  // extract props
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)

  // functional component
  // 函数式组件的vnode
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  const listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  data.on = data.nativeOn

  // 抽象组件可能是keep-alive,也可以是transition或者transitionGroup
  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    const slot = data.slot
    data = {}
    if (slot) {
      data.slot = slot
    }
  }

  // install component management hooks onto the placeholder node
   // 创建组件的时候会执行组件钩子
// 安装组件钩子函数
  installComponentHooks(data)

  // return a placeholder vnode
// 最后一步非常简单，通过 new VNode 实例化一个 vnode 并返回。
// 需要注意的是和普通元素节点的 vnode 不同，组件的 vnode 是没有 children 的，这点很关键
  const name = Ctor.options.name || tag
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

  // Weex specific: invoke recycle-list optimized @render function for
  // extracting cell-slot template.
  // https://github.com/Hanks10100/weex-native-directive/tree/master/component
  /* istanbul ignore if */
  if (__WEEX__ && isRecyclableComponent(vnode)) {
    return renderRecyclableComponentTemplate(vnode)
  }
  // 返回vnode
  return vnode
}

// 创建组件实例
export function createComponentInstanceForVnode (
  vnode: any, // we know it's MountedComponentVNode but flow doesn't
  parent: any, // activeInstance in lifecycle state
): Component {
//     createComponentInstanceForVnode 函数构造的一个内部组件的参数
//   它实际上是继承于 Vue 的一个构造器 Sub，相当于 new Sub(options)
//   这里有几个关键参数要注意几个点，_isComponent 为 true 表示它是一个组件，parent 表示当前激活的组件实例
  const options: InternalComponentOptions = {
    _isComponent: true,
    _parentVnode: vnode,
    parent
  }
  // check inline-template render functions
  // 动态组件内联模版
  const inlineTemplate = vnode.data.inlineTemplate
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render
    options.staticRenderFns = inlineTemplate.staticRenderFns
  }
  // new Vue(options)
  // ，然后执行 new vnode.componentOptions.Ctor(options)。
//   这里的 vnode.componentOptions.Ctor 对应的就是子组件的构造函数
//   所以子组件的实例化实际上就是在这个时机执行的，并且它会执行实例的 _init 方法
  return new vnode.componentOptions.Ctor(options)
}
// 整个 installComponentHooks 的过程就是把 componentVNodeHooks 的钩子函数合并到 data.hook 中
function installComponentHooks (data: VNodeData) {
  const hooks = data.hook || (data.hook = {})
  for (let i = 0; i < hooksToMerge.length; i++) {
    const key = hooksToMerge[i]
    const existing = hooks[key]
    const toMerge = componentVNodeHooks[key]
    if (existing !== toMerge && !(existing && existing._merged)) {
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge
    }
  }
}
// 把 componentVNodeHooks 的钩子函数合并到 data.hook 中
// 那么通过执行 mergeHook 函数做合并，这个逻辑很简单，就是在最终执行的时候，依次执行这两个钩子函数即可。
function mergeHook (f1: any, f2: any): Function {
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b)
    f2(a, b)
  }
  merged._merged = true
  return merged
}

// transform component v-model info (value and callback) into
// prop and event handler respectively.
// data.props = {
//   value: (message),
// }
// data.on = {
//   input: function ($$v) {
//     message=$$v
//   }
// } 
// let vm = new Vue({
//   el: '#app',
//   template: '<div>' +
//   '<child :value="message" @input="message=arguments[0]"></child>' +
//   '<p>Message is: {{ message }}</p>' +
//   '</div>',
//   data() {
//     return {
//       message: ''
//     }
//   },
//   components: {
//     Child
//   }
// })
// 子组件传递的 value 绑定到当前父组件的 message，同时监听自定义 input 事件，当子组件派发 input 事件的时候，
// 父组件会在事件回调函数中修改 message 的值，同时 value 也会发生变化，子组件的 input 值被更新。
// 这就是典型的 Vue 的父子组件通讯模式，父组件通过 prop 把数据传递到子组件，子组件修改了数据后把改变通过 $emit 事件的方式通知父组件，
// 所以说组件上的 v-model 也是一种语法糖。
// 另外我们注意到组件 v-model 的实现，子组件的 value prop 以及派发的 input 事件名是可配的，可以看到 transformModel 中对这部分的处理：
// 也就是说可以在定义子组件的时候通过 model 选项配置子组件接收的 prop 名以及派发的事件名
// let Child = {
//   template: '<div>'
//   + '<input :value="msg" @input="updateValue" placeholder="edit me">' +
//   '</div>',
//   props: ['msg'],
//   model: {
//     prop: 'msg',
//     event: 'change'
//   },
//   methods: {
//     updateValue(e) {
//       this.$emit('change', e.target.value)
//     }
//   }
// }

// let vm = new Vue({
//   el: '#app',
//   template: '<div>' +
//   '<child v-model="message"></child>' +
//   '<p>Message is: {{ message }}</p>' +
//   '</div>',
//   data() {
//     return {
//       message: ''
//     }
//   },
//   components: {
//     Child
//   }
// })
// 子组件修改了接收的 prop 名以及派发的事件名，然而这一切父组件作为调用方是不用关心的，这样做的好处是我们可以把 value 这个 prop 作为其它的用途。
function transformModel (options, data: any) {
  // transformModel 逻辑很简单，给 data.props 添加 data.model.value，
  const prop = (options.model && options.model.prop) || 'value'
  const event = (options.model && options.model.event) || 'input'
  ;(data.props || (data.props = {}))[prop] = data.model.value
//   并且给data.on 添加 data.model.callback
  const on = data.on || (data.on = {})
  if (isDef(on[event])) {
    on[event] = [data.model.callback].concat(on[event])
  } else {
    on[event] = data.model.callback
  }
}
