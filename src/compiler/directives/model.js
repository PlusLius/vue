/* @flow */

/**
 * Cross-platform code generation for component v-model
 */
// el.model = {
//   callback:'function ($$v) {message=$$v}',
//   expression:'"message"',
//   value:'(message)'
// }
// "_c(
//     'base-checkbox',
//         {
//           model:
//             {
//                 value:(lovingVue),
//                 callback:function ($$v) {
//                     // $on调用这个回调将$emit发送的值传过来
//                     lovingVue=$$v
//                 },
//                 expression:\"lovingVue\"
//             }
//         }
// )"
// "_c(
//     'input',
//     {
//         attrs:{
//             \"type\":\"checkbox\"
//         },
//         domProps:{
//             \"checked\":checked
//         },
//         on:{
//             \"change\":function($event){
//                 // 调用$emit发送一个change事件，将选中的值发送给v-model的组件
//                 return $emit('change', $event.target.checked)
//             }
//         }
//     }
// )"
export function genComponentModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
): ?boolean {
  const { number, trim } = modifiers || {}

  const baseValueExpression = '$$v'
  let valueExpression = baseValueExpression
  if (trim) {
    valueExpression =
      `(typeof ${baseValueExpression} === 'string'` +
      `? ${baseValueExpression}.trim()` +
      `: ${baseValueExpression})`
  }
  if (number) {
    valueExpression = `_n(${valueExpression})`
  }
  const assignment = genAssignmentCode(value, valueExpression)

  el.model = {
    value: `(${value})`,
    expression: `"${value}"`,
    callback: `function (${baseValueExpression}) {${assignment}}`
  }
}

/**
 * Cross-platform codegen helper for generating v-model value assignment code.
 */
// 在运行时解析v-model的时候调用，运行时添加字符拼接的工作，解析还是放在Compiler/directive
export function genAssignmentCode (
  value: string,
  assignment: string
): string {
  //该方法首先对 v-model 对应的 value 做了解析，它处理了非常多的情况，
  //对我们的例子，value 就是 messgae，所以返回的 res.key 为 null，
  const res = parseModel(value)
  // 发现key是null简单的做个赋值的拼接工作
  if (res.key === null) {
//     然后我们就得到 ${value}=${assignment}，也就是 message=$event.target.value。
    return `${value}=${assignment}`
  } else {
    return `$set(${res.exp}, ${res.key}, ${assignment})`
  }
}

/**
 * Parse a v-model expression into a base path and a final key segment.
 * Handles both dot-path and possible square brackets.
 *
 * Possible cases:
 *
 * - test
 * - test[key]
 * - test[test1[key]]
 * - test["a"][key]
 * - xxx.test[a[a].test1[key]]
 * - test.xxx.a["asa"][test1[key]]
 *
 */

let len, str, chr, index, expressionPos, expressionEndPos

type ModelParseResult = {
  exp: string,
  key: string | null
}
// {exp:xxx,key:xxx} 组装val结构
export function parseModel (val: string): ModelParseResult {
  // Fix https://github.com/vuejs/vue/pull/7730
  // allow v-model="obj.val " (trailing whitespace)
  val = val.trim()
  len = val.length

  if (val.indexOf('[') < 0 || val.lastIndexOf(']') < len - 1) {
    index = val.lastIndexOf('.')
    if (index > -1) {
      return {
        exp: val.slice(0, index),
        key: '"' + val.slice(index + 1) + '"'
      }
    } else {
      return {
        exp: val,
        key: null
      }
    }
  }

  str = val
  index = expressionPos = expressionEndPos = 0

  while (!eof()) {
    chr = next()
    /* istanbul ignore if */
    if (isStringStart(chr)) {
      parseString(chr)
    } else if (chr === 0x5B) {
      parseBracket(chr)
    }
  }

  return {
    exp: val.slice(0, expressionPos),
    key: val.slice(expressionPos + 1, expressionEndPos)
  }
}

function next (): number {
  return str.charCodeAt(++index)
}

function eof (): boolean {
  return index >= len
}

function isStringStart (chr: number): boolean {
  return chr === 0x22 || chr === 0x27
}

function parseBracket (chr: number): void {
  let inBracket = 1
  expressionPos = index
  while (!eof()) {
    chr = next()
    if (isStringStart(chr)) {
      parseString(chr)
      continue
    }
    if (chr === 0x5B) inBracket++
    if (chr === 0x5D) inBracket--
    if (inBracket === 0) {
      expressionEndPos = index
      break
    }
  }
}

function parseString (chr: number): void {
  const stringQuote = chr
  while (!eof()) {
    chr = next()
    if (chr === stringQuote) {
      break
    }
  }
}
