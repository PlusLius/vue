/* @flow */

import { warn } from './debug'
import { observe, toggleObserving, shouldObserve } from '../observer/index'
import {
  hasOwn,
  isObject,
  toRawType,
  hyphenate,
  capitalize,
  isPlainObject
} from 'shared/util'

type PropOptions = {
  type: Function | Array<Function> | null,
  default: any,
  required: ?boolean,
  validator: ?Function
};
// 校验的逻辑很简单，遍历 propsOptions，执行 validateProp(key, propsOptions, propsData, vm) 方法。
// 这里的 propsOptions 就是我们定义的 props 在规范后生成的 options.props 对象，propsData 是从父组件传递的 prop 数据。
// 所谓校验的目的就是检查一下我们传递的数据是否满足 prop的定义规范。再来看一下 validateProp 方法
// validateProp 主要就做 3 件事情：处理 Boolean 类型的数据，处理默认数据，prop 断言，并最终返回 prop 的值。
export function validateProp (
  key: string,
  propOptions: Object,
  propsData: Object,
  vm?: Component
): any {
  const prop = propOptions[key]
  const absent = !hasOwn(propsData, key)
  let value = propsData[key]
  // boolean casting
//   先来看 Boolean 类型数据的处理逻辑：
//   先通过 const booleanIndex = getTypeIndex(Boolean, prop.type) 来判断 prop 的定义是否是 Boolean 类型的。
  const booleanIndex = getTypeIndex(Boolean, prop.type)
//   回到 validateProp 函数，通过 const booleanIndex = getTypeIndex(Boolean, prop.type) 得到 booleanIndex，
//   如果 prop.type 是一个 Boolean 类型，则通过 absent && !hasOwn(prop, 'default') 来判断如果父组件没有传递这个 prop 数据并且没有设置 default 的情况，则 value 为 false。
  if (booleanIndex > -1) {
//     如果 prop.type 是一个 Boolean 类型，则通过 absent && !hasOwn(prop, 'default') 来判断如果父组件没有传递这个 prop 数据并且没有设置 default 的情况，则 value 为 f
    if (absent && !hasOwn(prop, 'default')) {
      value = false
//       接着判断value === '' || value === hyphenate(key) 的情况，
//       如果满足则先通过 const stringIndex = getTypeIndex(String, prop.type) 获取匹配 String 类型的索引，
//       然后判断 stringIndex < 0 || booleanIndex < stringIndex 的值来决定 value 的值是否为 true。这块逻辑稍微有点绕，
    } else if (value === '' || value === hyphenate(key)) {
      // only cast empty string / same name to boolean if
      // boolean has higher priority
      const stringIndex = getTypeIndex(String, prop.type)
      if (stringIndex < 0 || booleanIndex < stringIndex) {
//          然后判断 stringIndex < 0 || booleanIndex < stringIndex 的值来决定 value 的值是否为 true。这块逻辑稍微有点绕，
        value = true
      }
    }
  }
  // check default value
//   接下来看一下默认数据处理逻辑：
  if (value === undefined) {
//     当 value 的值为 undefined 的时候，说明父组件根本就没有传这个 prop，那么我们就需要通过 getPropDefaultValue(vm, prop, key)
//     获取这个 prop 的默认值。我们这里只关注 getPropDefaultValue 的实现，toggleObserving 和 observe 的作用我们之后会说。
    value = getPropDefaultValue(vm, prop, key)
    // since the default value is a fresh copy,
    // make sure to observe it.
    const prevShouldObserve = shouldObserve
    toggleObserving(true)
    observe(value)
    toggleObserving(prevShouldObserve)
  }
  if (
    process.env.NODE_ENV !== 'production' &&
    // skip validation for weex recycle-list child component props
    !(__WEEX__ && isObject(value) && ('@binding' in value))
  ) {
//     最后来看一下 prop 断言逻辑。
    assertProp(prop, key, value, vm, absent)
  }
  return value
}

/**
 * Get the default value of a prop.
 */
function getPropDefaultValue (vm: ?Component, prop: PropOptions, key: string): any {
  // no default, return undefined
//   检测如果 prop 没有定义 default 属性，那么返回 undefined，通过这块逻辑我们知道除了 Boolean 类型的数据，其余没有设置 default 属性的 prop 默认值都是 undefined。
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  const def = prop.default
  // warn against non-factory defaults for Object & Array
//   接着是开发环境下对 prop 的默认值是否为对象或者数组类型的判断，如果是的话会报警告，因为对象和数组类型的 prop，他们的默认值必须要返回一个工厂函数。
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn(
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    )
  }
  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
//   接下来的判断是如果上一次组件渲染父组件传递的 prop 的值是 undefined，则直接返回 上一次的默认值 vm._props[key]，这样可以避免触发不必要的 watcher 的更新。
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
  ) {
    return vm._props[key]
  }
  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
//   最后就是判断 def 如果是工厂函数且 prop 的类型不是 Function 的时候，返回工厂函数的返回值，否则直接返回 def。
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
    : def
}

/**
 * Assert whether a prop is valid.
 */
// assertProp 函数的目的是断言这个 prop 是否合法。

// 首先判断如果 prop 定义了 required 属性但父组件没有传递这个 prop 数据的话会报一个警告。

// 接着判断如果 value 为空且 prop 没有定义 required 属性则直接返回。

// 然后再去对 prop 的类型做校验，先是拿到 prop 中定义的类型 type，并尝试把它转成一个类型数组，然后依次遍历这个数组，执行 assertType(value, type[i]) 去获取断言的结果，直到遍历完成或者是 valid 为 true 的时候跳出循环。
function assertProp (
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
// 首先判断如果 prop 定义了 required 属性但父组件没有传递这个 prop 数据的话会报一个警告。
  if (prop.required && absent) {
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }
//     接着判断如果 value 为空且 prop 没有定义 required 属性则直接返回。
  if (value == null && !prop.required) {
    return
  }
  let type = prop.type
  let valid = !type || type === true
  const expectedTypes = []
//    然后再去对 prop 的类型做校验，先是拿到 prop 中定义的类型 type，并尝试把它转成一个类型数组，然后依次遍历这个数组，
//   然后依次遍历这个数组，执行 assertType(value, type[i]) 去获取断言的结果，直到遍历完成或者是 valid 为 true 的时候跳出循环。
  if (type) {
    if (!Array.isArray(type)) {
      type = [type]
    }
    for (let i = 0; i < type.length && !valid; i++) {
      const assertedType = assertType(value, type[i])
      expectedTypes.push(assertedType.expectedType || '')
      valid = assertedType.valid
    }
  }
//   如果循环结束后 valid 仍然为 false，那么说明 prop 的值 value 与 prop 定义的类型都不匹配，
//   那么就会输出一段通过 getInvalidTypeMessage(name, value, expectedTypes) 生成的警告信息，就不细说了。
  if (!valid) {
    warn(
      `Invalid prop: type check failed for prop "${name}".` +
      ` Expected ${expectedTypes.map(capitalize).join(', ')}` +
      `, got ${toRawType(value)}.`,
      vm
    )
    return
  }
//     最后判断当 prop 自己定义了 validator 自定义校验器，则执行 validator 校验器方法，如果校验不通过则输出警告信息。
  const validator = prop.validator
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/
// assertType 的逻辑很简单，先通过 getType(type) 获取 prop 期望的类型 expectedType，然后再去根据几种不同的情况对比 prop 的值 value 是否和 expectedType 匹配，最后返回匹配的结果。
function assertType (value: any, type: Function): {
  valid: boolean;
  expectedType: string;
} {
  let valid
  const expectedType = getType(type)
  if (simpleCheckRE.test(expectedType)) {
    const t = typeof value
    valid = t === expectedType.toLowerCase()
    // for primitive wrapper objects
    if (!valid && t === 'object') {
      valid = value instanceof type
    }
  } else if (expectedType === 'Object') {
    valid = isPlainObject(value)
  } else if (expectedType === 'Array') {
    valid = Array.isArray(value)
  } else {
    valid = value instanceof type
  }
  return {
    valid,
    expectedType
  }
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */
function getType (fn) {
  const match = fn && fn.toString().match(/^\s*function (\w+)/)
  return match ? match[1] : ''
}

function isSameType (a, b) {
  return getType(a) === getType(b)
}
// 先通过 const booleanIndex = getTypeIndex(Boolean, prop.type) 来判断 prop 的定义是否是 Boolean 类型的。
function getTypeIndex (type, expectedTypes): number {
//   getTypeIndex 函数就是找到 type 和 expectedTypes 匹配的索引并返回。
//   如果 expectedTypes 是单个构造函数，就执行 isSameType 去判断是否是同一个类型
  if (!Array.isArray(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1
  }
//   ；如果是数组，那么就遍历这个数组，找到第一个同类型的，返回它的索引。
  for (let i = 0, len = expectedTypes.length; i < len; i++) {
    if (isSameType(expectedTypes[i], type)) {
      return i
    }
  }
  return -1
}
