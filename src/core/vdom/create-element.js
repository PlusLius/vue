/* @flow */
//创建虚拟dom
import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset
} from '../util/index'

import {
  normalizeChildren,
  simpleNormalizeChildren
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
// createElement实际是对_createElement的封装参数更加灵活
// 在处理这些参数后，调用真正创建 VNode 的函数 _createElement

// (function anonymous(
// ) {
//     with (this) {
//         return _c(
//             'div',
//             { staticClass: "test", style: (positionStyle), attrs: { "id": "app" } },
//             [_v("\n        aaasdlfhl\n        "),
//             _c('hello-word'),
//             _v(" "),
//             _c('global', [_c('other')], 1)
//             ],
//             1)
//     }
// })
//  vm._c = (a, b, c, d) => {
//     createElement(vm, a, b, c, d, false);
//   }
// vm.$createElement = (a, b, c, d) => {
//     createElement(vm, a, b, c, d, true);
//   }
export function createElement (
  context: Component, // vm 内置填进去的
  tag: any, //  tag 传入的是字符串，动态变量在with(this)的情况下会拿取到该值对应的字符串组件
  data: any, // options.data
  children: any, // [vnode] or text
  normalizationType: any, // 组件类型是1 不是组件类型是 0
  alwaysNormalize: boolean // 内置填进去的_c是false 不需要永远规范化 $createElement手写render需要一直规范化
): VNode | Array<VNode> {
   // 在没传data的情况下
    // createElement(div, ['div',div'], 1)
    // 如果是字符，布尔类型，数字类型
    // createElement(div, 'hello world', 0)
  if (Array.isArray(data) || isPrimitive(data)) {
   // 将children的值给normalizationType
    normalizationType = children
    // 将data的值给children
    children = data
    // 将data改成undefined
    data = undefined
  }
   // 如果alwaysNormalize为true就设置为ALWAYS_NORMALIZE，用户手写render就把规范类型改成2
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  // 真正生成虚拟dom的方法
  return _createElement(context, tag, data, children, normalizationType)
}
// _createElement 方法有 5 个参数， 
// context 表示 VNode 的上下文环境，它是 Component 类型；实际就是当前的vm实例
// tag 表示标签，它可以是一个字符串，也可以是一个 Component；
// data 表示 VNode 的数据，它是一个 VNodeData 类型
// children 表示当前 VNode 的子节点，它是任意类型的，它接下来需要被规范为标准的 VNode 数组；
// normalizationType 表示子节点规范的类型，类型不同规范的方法也就不一样，看传入的是true还是false
// 它主要是参考 render 函数是编译生成的还是用户手写的。
//   vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
//   vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)
//   return createElement('div', {
//      attrs: {
//         id: 'app'
//       },
//   }, this.message)
// createElement 创建 VNode 的过程，每个 VNode 有 children，
// children 每个元素也是一个 VNode，这样就形成了一个 VNode Tree，它很好的描述了我们的 DOM Tree。
// normalizeChildren 规范化的过程实际就是创建子vnode的过程
export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  if (isDef(data) && isDef((data: any).__ob__)) {
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    return createEmptyVNode()
  }
  // object syntax in v-bind
  if (isDef(data) && isDef(data.is)) {
    // 拿到动态组件上绑定的is值作为tag
    tag = data.is
  }
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  // warn against non-primitive key
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }
  // support single function children as default scoped slot
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  if (normalizationType === ALWAYS_NORMALIZE) {
    // 如果是多层嵌套的情况，使用normalizeChildren创建子vnode
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    // 如果只有一层嵌套的情况使用simpleNormalizeChildren创建子vnode
    children = simpleNormalizeChildren(children)
  }
 // 当统一转成vnode类型后
// 接下来会去创建vnode实例
  let vnode, ns
  if (typeof tag === 'string') { // 这里先对 tag 做判断，如果是 string 类型
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    if (config.isReservedTag(tag)) { // 则接着判断如果是内置的一些节点，则直接创建一个普通 VNode，
      // platform built-in elements
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if (isDef(Ctor = resolveAsset(context.$options, 'components', tag))) { // ，如果是为已注册的组件名，则通过 createComponent 创建一个组件类型的 VNode，
      // component
      vnode = createComponent(Ctor, data, context, children, tag)
    } else { // 则创建一个未知的标签的 VNode。
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else { //  如果是 tag 一个 Component 类型，则直接调用 createComponent 创建一个组件类型的 VNode 节点。
    // direct component options / constructor
//     var app = new Vue({
//       el: '#app',
//       // 这里的 h 是 createElement 方法
//       render: h => h(App)
//     })
// 传入的是一个 App 对象，它本质上是一个 Component 类型，那么它会走到上述代码的 else 逻辑，直接通过 createComponent 方法来创建 vnode
    vnode = createComponent(tag, data, context, children)
  }
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
    return createEmptyVNode()
  }
}

function applyNS (vnode, ns, force) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}
