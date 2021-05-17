/* @flow */

import type VNode from 'core/vdom/vnode'

/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 */
// resolveSlots 方法接收 2 个参数，第一个参数 chilren 对应的是父 vnode 的 children，
// 在我们的例子中就是 <app-layout> 和 </app-layout> 包裹的内容。
// 第二个参数 context 是父 vnode 的上下文，也就是父组件的 vm 实例。
export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  const slots = {}
  if (!children) {
    return slots
  }
//   resolveSlots 函数的逻辑就是遍历 chilren
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]
//     ，拿到每一个 child 的 data
    const data = child.data
    // remove slot attribute if the node is resolved as a Vue slot node
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot
    }
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
//        ，然后通过 data.slot 获取到插槽名称， 这个 slot 就是我们之前编译父组件在 codegen 阶段设置的 data.slot。
      const name = data.slot
//        接着以插槽名称为 key 把 child 添加到 slots 中，
      const slot = (slots[name] || (slots[name] = []))
//       如果 data.slot 不存在，则是默认插槽的内容，则把对应的 child 添加到 slots.defaults 中。
      if (child.tag === 'template') {
        slot.push.apply(slot, child.children || [])
      } else {
        slot.push(child)
      }
    } else {
      (slots.default || (slots.default = [])).push(child)
    }
  }
  // ignore slots that contains only whitespace
  for (const name in slots) {
    if (slots[name].every(isWhitespace)) {
      delete slots[name]
    }
  }
//   这样就获取到整个 slots，它是一个对象，key 是插槽名称，value 是一个 vnode 类型的数组，因为它可以有多个同名插槽。
  return slots
}

function isWhitespace (node: VNode): boolean {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}

export function resolveScopedSlots (
  fns: ScopedSlotsData, // see flow/vnode
  res?: Object
): { [key: string]: Function } {
  res = res || {}
  for (let i = 0; i < fns.length; i++) {
    if (Array.isArray(fns[i])) {
      resolveScopedSlots(fns[i], res)
    } else {
      res[fns[i].key] = fns[i].fn
    }
  }
  return res
}
