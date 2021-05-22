/* @flow */

import { isDef, isUndef } from 'shared/util'
import { updateListeners } from 'core/vdom/helpers/index'
import { withMacroTask, isIE, supportsPassive } from 'core/util/index'
import { RANGE_TOKEN, CHECKBOX_RADIO_TOKEN } from 'web/compiler/directives/model'

// normalize v-model event tokens that can only be determined at runtime.
// it's important to place the event as the first in the array because
// the whole point is ensuring the v-model callback gets called before
// user-attached handlers.
function normalizeEvents (on) {
  /* istanbul ignore if */
  if (isDef(on[RANGE_TOKEN])) {
    // IE input[type=range] only supports `change` event
    const event = isIE ? 'change' : 'input'
    on[event] = [].concat(on[RANGE_TOKEN], on[event] || [])
    delete on[RANGE_TOKEN]
  }
  // This was originally intended to fix #4521 but no longer necessary
  // after 2.5. Keeping it for backwards compat with generated code from < 2.4
  /* istanbul ignore if */
  if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
    on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || [])
    delete on[CHECKBOX_RADIO_TOKEN]
  }
}

let target: any

function createOnceHandler (handler, event, capture) {
  const _target = target // save current target element in closure
  return function onceHandler () {
    const res = handler.apply(null, arguments)
    if (res !== null) {
      remove(event, onceHandler, capture, _target)
    }
  }
}
// add 和 remove 的逻辑很简单，就是实际上调用原生 addEventListener 和 removeEventListener，并根据参数传递一些配置，注意这里的 hanlder 会用 withMacroTask(hanlder) 包裹一下
function add (
  event: string,
  handler: Function,
  once: boolean,
  capture: boolean,
  passive: boolean
) {
  handler = withMacroTask(handler)
  if (once) handler = createOnceHandler(handler, event, capture)
  target.addEventListener(
    event,
    handler,
    supportsPassive
      ? { capture, passive }
      : capture
  )
}

function remove (
  event: string,
  handler: Function,
  capture: boolean,
  _target?: HTMLElement
) {
  (_target || target).removeEventListener(
    event,
    handler._withTask || handler,
    capture
  )
}
//
function updateDOMListeners (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
//   首先获取 vnode.data.on，这就是我们之前的生成的 data 中对应的事件对象，
  const on = vnode.data.on || {}
  const oldOn = oldVnode.data.on || {}
//   target 是当前 vnode 对于的 DOM 对象，
  target = vnode.elm
//    normalizeEvents 主要是对 v-model 相关的处理，我们之后分析 v-model 的时候会介绍，
  normalizeEvents(on)
//   接着调用 updateListeners(on, oldOn, add, remove, vnode.context) 方法，
  updateListeners(on, oldOn, add, remove, vnode.context)
  target = undefined
}
// 在 patch 过程中的创建阶段和更新阶段都会执行 updateDOMListeners：
export default {
  create: updateDOMListeners,
  update: updateDOMListeners
}
