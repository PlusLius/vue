/* @flow */

import config from 'core/config'
import { addHandler, addProp, getBindingAttr } from 'compiler/helpers'
import { genComponentModel, genAssignmentCode } from 'compiler/directives/model'

let warn

// in some cases, the event used has to be determined at runtime
// so we used some reserved tokens during compile.
export const RANGE_TOKEN = '__r'
export const CHECKBOX_RADIO_TOKEN = '__c'

// 也就是说我们执行 needRuntime = !!gen(el, dir, state.warn) 就是在执行 model 函数，
// 它会根据 AST 元素节点的不同情况去执行不同的逻辑，对于我们这个 case 而言，
// 它会命中 genDefaultModel(el, value, modifiers) 的逻辑，稍后我们也会介绍组件的处理，
export default function model (
  el: ASTElement,
  dir: ASTDirective,
  _warn: Function
): ?boolean {
  warn = _warn
  const value = dir.value
  const modifiers = dir.modifiers
  const tag = el.tag
  const type = el.attrsMap.type

  if (process.env.NODE_ENV !== 'production') {
    // inputs with type="file" are read only and setting the input's
    // value will throw an error.
    if (tag === 'input' && type === 'file') {
      warn(
        `<${el.tag} v-model="${value}" type="file">:\n` +
        `File inputs are read only. Use a v-on:change listener instead.`
      )
    }
  }

  if (el.component) {
    genComponentModel(el, value, modifiers)
    // component v-model doesn't need extra runtime
    return false
  } else if (tag === 'select') {
    genSelect(el, value, modifiers)
  } else if (tag === 'input' && type === 'checkbox') {
    genCheckboxModel(el, value, modifiers)
  } else if (tag === 'input' && type === 'radio') {
    genRadioModel(el, value, modifiers)
  } else if (tag === 'input' || tag === 'textarea') {
    genDefaultModel(el, value, modifiers)
  } else if (!config.isReservedTag(tag)) {
// 生成组件v-model
// el.model = {
//  callback:'function ($$v) {message=$$v}',
//  expression:'"message"',
//  value:'(message)'
//}
    genComponentModel(el, value, modifiers)
    // component v-model doesn't need extra runtime
    return false
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `<${el.tag} v-model="${value}">: ` +
      `v-model is not supported on this element type. ` +
      'If you are working with contenteditable, it\'s recommended to ' +
      'wrap a library dedicated for that purpose inside a custom component.'
    )
  }

  // ensure runtime directive metadata
  return true
}

// _c(
//     'input',{
//         directives:[
//             {
//                 name:\"model\",
//                 rawName:\"v-model\",
//                 value:(checkedNames),
//                 expression:\"checkedNames\"
//             }
//         ],
//         attrs:{
//             \"type\":\"checkbox\",
//             \"id\":\"jack\",
//             \"value\":\"Jack\"
//         },
//         domProps:{
//             \"checked\":Array.isArray(checkedNames)
//             ?_i(checkedNames,\"Jack\")>-1
//             :(checkedNames)
//         },
//         on:{
//             \"change\":function($event){
//                 var $$a=checkedNames,
//                 $$el=$event.target,
//                 $$c=$$el.checked?(true):(false);
//                 if(Array.isArray($$a)){
//                     // 是数组的情况拿到value值
//                     var $$v=\"Jack\",
//                     // 查找当前数组中value值的位置
//                     $$i=_i($$a,$$v);
//                     // 选中的情况
//                     if($$el.checked){
//                         // 选中后没有找到这个值那么就把他合并到v-model绑定的值
//                         $$i<0&&(checkedNames=$$a.concat([$$v]))
//                     }else{
//                         // 没选中的情况，就将该值从v-model绑定的数组中删除
//                         $$i>-1&&(checkedNames=$$a.slice(0,$$i).concat($$a.slice($$i+1)))
//                     }
//                 }else{
//                     // 不是数组拿到勾选的值给v-model绑定的值
//                     checkedNames=$$c
//                 }
//             }
//         }
//     }
// )"
function genCheckboxModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
) {
  const number = modifiers && modifiers.number
  const valueBinding = getBindingAttr(el, 'value') || 'null'
  const trueValueBinding = getBindingAttr(el, 'true-value') || 'true'
  const falseValueBinding = getBindingAttr(el, 'false-value') || 'false'
  addProp(el, 'checked',
    `Array.isArray(${value})` +
    `?_i(${value},${valueBinding})>-1` + (
      trueValueBinding === 'true'
        ? `:(${value})`
        : `:_q(${value},${trueValueBinding})`
    )
  )
  addHandler(el, 'change',
    `var $$a=${value},` +
        '$$el=$event.target,' +
        `$$c=$$el.checked?(${trueValueBinding}):(${falseValueBinding});` +
    'if(Array.isArray($$a)){' +
      `var $$v=${number ? '_n(' + valueBinding + ')' : valueBinding},` +
          '$$i=_i($$a,$$v);' +
      `if($$el.checked){$$i<0&&(${genAssignmentCode(value, '$$a.concat([$$v])')})}` +
      `else{$$i>-1&&(${genAssignmentCode(value, '$$a.slice(0,$$i).concat($$a.slice($$i+1))')})}` +
    `}else{${genAssignmentCode(value, '$$c')}}`,
    null, true
  )
}

function genRadioModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
) {
  const number = modifiers && modifiers.number
  let valueBinding = getBindingAttr(el, 'value') || 'null'
  valueBinding = number ? `_n(${valueBinding})` : valueBinding
  addProp(el, 'checked', `_q(${value},${valueBinding})`)
  addHandler(el, 'change', genAssignmentCode(value, valueBinding), null, true)
}

function genSelect (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
) {
  const number = modifiers && modifiers.number
  const selectedVal = `Array.prototype.filter` +
    `.call($event.target.options,function(o){return o.selected})` +
    `.map(function(o){var val = "_value" in o ? o._value : o.value;` +
    `return ${number ? '_n(val)' : 'val'}})`

  const assignment = '$event.target.multiple ? $$selectedVal : $$selectedVal[0]'
  let code = `var $$selectedVal = ${selectedVal};`
  code = `${code} ${genAssignmentCode(value, assignment)}`
  addHandler(el, 'change', code, null, true)
}

function genDefaultModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
): ?boolean {
  const type = el.attrsMap.type

  // warn if v-bind:value conflicts with v-model
  // except for inputs with v-bind:type
  if (process.env.NODE_ENV !== 'production') {
    const value = el.attrsMap['v-bind:value'] || el.attrsMap[':value']
    const typeBinding = el.attrsMap['v-bind:type'] || el.attrsMap[':type']
    if (value && !typeBinding) {
      const binding = el.attrsMap['v-bind:value'] ? 'v-bind:value' : ':value'
      warn(
        `${binding}="${value}" conflicts with v-model on the same element ` +
        'because the latter already expands to a value binding internally'
      )
    }
  }
// genDefaultModel 函数先处理了 modifiers，它的不同主要影响的是 event 和 valueExpression 的值，
  const { lazy, number, trim } = modifiers || {}
  const needCompositionGuard = !lazy && type !== 'range'
  const event = lazy
    ? 'change'
    : type === 'range'
      ? RANGE_TOKEN
      : 'input'

  let valueExpression = '$event.target.value'
  if (trim) {
    valueExpression = `$event.target.value.trim()`
  }
  if (number) {
// 对于我们的例子，event 为 input，valueExpression 为 $event.target.value
    valueExpression = `_n(${valueExpression})`
  }
// 。然后去执行 genAssignmentCode 去生成代码，
  let code = genAssignmentCode(value, valueExpression)
// 。然后我们又命中了 needCompositionGuard 为 true 的逻辑，所以最终的 code 为 if($event.target.composing)return;message=$event.target.value。
  if (needCompositionGuard) {
    code = `if($event.target.composing)return;${code}`
  }
// code 生成完后，又执行了 2 句非常关键的代码：
// 这实际上就是 input 实现 v-model 的精髓，通过修改 AST 元素，
// 给 el 添加一个 prop，相当于我们在 input 上动态绑定了 value，又给 el 添加了事件处理，
// 相当于在 input 上绑定了 input 事件，其实转换成模板如下：
//<input
//  v-bind:value="message"
//  v-on:input="message=$event.target.value">
// 其实就是动态绑定了 input 的 value 指向了 messgae 变量，并且在触发 input 事件的时候去动态把 message 设置为目标值，
// 这样实际上就完成了数据双向绑定了，所以说 v-model 实际上就是语法糖。
  addProp(el, 'value', `(${value})`)
  addHandler(el, event, code, null, true)
  if (trim || number) {
    addHandler(el, 'blur', '$forceUpdate()')
  }
}
