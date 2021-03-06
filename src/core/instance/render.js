/* @flow */

import {
  warn,
  nextTick,
  emptyObject,
  handleError,
  defineReactive
} from '../util/index'

import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import { resolveSlots } from './render-helpers/resolve-slots'
import VNode, { createEmptyVNode } from '../vdom/vnode'

import { isUpdatingChildComponent } from './lifecycle'

export function initRender (vm: Component) {
  vm._vnode = null // the root of the child tree
  vm._staticTrees = null // v-once cached trees
  const options = vm.$options
  const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree
  const renderContext = parentVnode && parentVnode.context
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
  vm.$scopedSlots = emptyObject
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  //vue开发人员使用的方法
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  // normalization is always applied for the public version, used in
  // user-written render functions.
  //给开发者使用的方法，在写render方法的时候传入的方法，最终还是调用的createElement来生成虚拟dom
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  const parentData = parentVnode && parentVnode.data

  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
    }, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
    }, true)
  } else {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
  }
}

export function renderMixin (Vue: Class<Component>) {
  // install runtime convenience helpers
  installRenderHelpers(Vue.prototype)

  Vue.prototype.$nextTick = function (fn: Function) {
    return nextTick(fn, this)
  }

  Vue.prototype._render = function (): VNode {
    const vm: Component = this
//     这里的 _parentVnode 就是当前组件的父 VNode
//     而 render 函数生成的 vnode 当前组件的渲染 vnode
    const { render, _parentVnode } = vm.$options

    // reset _rendered flag on slots for duplicate slot check
    if (process.env.NODE_ENV !== 'production') {
      for (const key in vm.$slots) {
        // $flow-disable-line
        vm.$slots[key]._rendered = false
      }
    }

    if (_parentVnode) {
      // 这个 _parentVNode.data.scopedSlots 对应的就是我们在父组件通过执行 resolveScopedSlots 返回的对象。
      // 所以回到 genSlot 函数，我们就可以通过插槽的名称拿到对应的 scopedSlotFn，然后把相关的数据扩展到 props 上，
      // 作为函数的参数传入，原来之前我们提到的函数这个时候执行，然后返回生成的 vnodes，为后续渲染节点用。
//       {$stable: true, $key: undefined, $hasNormal: false, default: ƒ}
//       default: ƒ ()
//       $hasNormal: false
//       $key: undefined
//       $stable: true
//       __proto__: Object
      vm.$scopedSlots = _parentVnode.data.scopedSlots || emptyObject
      
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
//     vnode 的 parent 指向了 _parentVnode，也就是 vm.$vnode，它们是一种父子的关系。
    vm.$vnode = _parentVnode
    // render self
    let vnode
    try {
//       render: function (createElement) {
//         return createElement('div', {
//            attrs: {
//               id: 'app'
//             },
//         }, this.message)
//       }
//       render方法的调用，将执行环境指向vue._renderProxy，传入虚拟dom方法
//       最终生成vnode
//      vm._render 最终是通过执行 createElement 方法并返回的是 vnode，它是一个虚拟 Node。Vue
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      handleError(e, vm, `render`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        if (vm.$options.renderError) {
          try {
            vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
          } catch (e) {
            handleError(e, vm, `renderError`)
            vnode = vm._vnode
          }
        } else {
          vnode = vm._vnode
        }
      } else {
        vnode = vm._vnode
      }
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      vnode = createEmptyVNode()
    }
    // set parent
//     vnode 的 parent 指向了 _parentVnode，也就是 vm.$vnode，它们是一种父子的关系。
    vnode.parent = _parentVnode
    return vnode
  }
}
