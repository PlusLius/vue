/* @flow */

import { extend, warn, isObject } from 'core/util/index'

/**
 * Runtime helper for rendering <slot>
 */
// 普通标签向插槽传值被编译到attrs上
//     staticClass:"container"
//   template: '<div>' +
//   '<app-layout>' +
//   '<h1 slot="header">{{title}}</h1>' +
//   '<p>{{msg}}</p>' +
//   '<p slot="footer">{{desc}}</p>' +
//   '</app-layout>' +
//   '</div>',

// with(this){
//   return _c('div',
//     [_c('app-layout',
//       [_c('h1',{attrs:{"slot":"header"},slot:"header"},
//          [_v(_s(title))]),
//        _c('p',[_v(_s(msg))]),
//        _c('p',{attrs:{"slot":"footer"},slot:"footer"},
//          [_v(_s(desc))]
//          )
//        ])
//      ],
//    1)}

// 普通slot标签被被编译成
// let AppLayout = {
//   template: '<div class="container">' +
//   '<header><slot name="header"></slot></header>' +
//   '<main><slot>默认内容</slot></main>' +
//   '<footer><slot name="footer"></slot></footer>' +
//   '</div>'
// }

// with(this) {
//   return _c('div',{
//     staticClass:"container"
//     },[
//       _c('header',[_t("header")],2),
//       _c('main',[_t("default",[_v("默认内容")])],2),
//       _c('footer',[_t("footer")],2)
//       ]
//    )
// }

export function renderSlot (
  name: string,
  fallback: ?Array<VNode>,
  props: ?Object,
  bindObject: ?Object
): ?Array<VNode> {
//   render-slot 的参数 name 代表插槽名称 slotName，
//   fallback 代表插槽的默认内容生成的 vnode 数组。先忽略 scoped-slot，只看默认插槽逻辑。
//   如果 this.$slot[name] 有值，就返回它对应的 vnode 数组，
//   否则返回 fallback。那么这个 this.$slot 是哪里来的呢？我们知道子组件的 init 时机是在父组件执行 patch 过程的时候，
//   那这个时候父组件已经编译完成了。并且子组件在 init 过程中会执行 initRender 函数，initRender 的时候获取到 vm.$slot
  const scopedSlotFn = this.$scopedSlots[name] // ，那么这个 this.$scopedSlots 又是在什么地方定义的呢，原来在子组件的渲染函数执行前，在 vm_render 方法内，有这么一段逻辑，
  let nodes
  if (scopedSlotFn) { // scoped slot
    props = props || {}
    if (bindObject) {
      if (process.env.NODE_ENV !== 'production' && !isObject(bindObject)) {
        warn(
          'slot v-bind without argument expects an Object',
          this
        )
      }
      props = extend(extend({}, bindObject), props)
    }
// 作用域插槽，父组件在编译和渲染阶段并不会直接生成 vnodes，而是在父节点 vnode 的 data 中保留一个 scopedSlots 对象，存储着不同名称的插槽以及它们对应的渲染函数，只有在编译和渲染子组件阶段才会执行这个渲染函数生成 vnodes，由于是在子组件环境执行的，所以对应的数据作用域是子组件实例。
  // 拿到对应插槽函数的节点，
    nodes = scopedSlotFn(props) || fallback
  } else {
//     这样我们就拿到了 vm.$slots 了，回到 renderSlot 函数，const slotNodes = this.$slots[name]，
//     我们也就能根据插槽名称获取到对应的 vnode 数组了，这个数组里的 vnode 都是在父组件创建的，这样就实现了在父组件替换子组件插槽的内容了。
//     对应的 slot 渲染成 vnodes，作为当前组件渲染 vnode 的 children，之后的渲染过程之前分析过，不再赘述。
    const slotNodes = this.$slots[name] // 拿到要插入的元素
    // warn duplicate slot usage
    if (slotNodes) {
      if (process.env.NODE_ENV !== 'production' && slotNodes._rendered) {
        warn(
          `Duplicate presence of slot "${name}" found in the same render tree ` +
          `- this will likely cause render errors.`,
          this
        )
      }
      slotNodes._rendered = true
    }
//     普通插槽是在父组件编译和渲染阶段生成 vnodes，所以数据的作用域是父组件实例，子组件渲染的时候直接拿到这些渲染好的 vnodes
    // 将要插入的父元素给nodes
    nodes = slotNodes || fallback
  }

  const target = props && props.slot
  if (target) {
    return this.$createElement('template', { slot: target }, nodes)
  } else {
    // 拿到第一个slot -> h1这个标签
    return nodes
  }
}
