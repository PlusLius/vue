/* @flow */
// option文件主要作用是各种配置合并的
// 对于 el、propsData 选项使用默认的合并策略 defaultStrat。
// 对于 data 选项，使用 mergeDataOrFn 函数进行处理，最终结果是 data 选项将变成一个函数，且该函数的执行结果为真正的数据对象。
// 对于 生命周期钩子 选项，将合并成数组，使得父子选项中的钩子函数都能够被执行
// 对于 directives、filters 以及 components 等资源选项，父子选项将以原型链的形式被处理，正是因为这样我们才能够在任何地方都使用内置组件、指令等。
// 对于 watch 选项的合并处理，类似于生命周期钩子，如果父子选项都有相同的观测字段，将被合并为数组，这样观察者都将被执行。
// 对于 props、methods、inject、computed 选项，父选项始终可用，但是子选项会覆盖同名的父选项字段。
// 对于 provide 选项，其合并策略使用与 data 选项相同的 mergeDataOrFn 函数。
// 最后，以上没有提及到的选项都将使默认选项 defaultStrat。
// 最最后，默认合并策略函数 defaultStrat 的策略是：只要子选项不是 undefined 就使用子选项，否则使用父选项。
import config from '../config'
import { warn } from './debug'
import { nativeWatch } from './env'
import { set } from '../observer/index'

import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS
} from 'shared/constants'

import {
  extend,
  hasOwn,
  camelize,
  toRawType,
  capitalize,
  isBuiltInTag,
  isPlainObject
} from 'shared/util'

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
const strats = config.optionMergeStrategies // config文件的optionMergeStrategies =》 {}

/**
 * Options with restrictions
 */
if (process.env.NODE_ENV !== 'production') {
  // 子组件
  // var ChildComponent = {
  //   el: '#app2',
  //   created: function () {
  //     console.log('child component created')
  //   }
  // }

  // // 父组件
  // new Vue({
  //   el: '#app',
  //   data: {
  //     test: 1
  //   },
  //   components: {
  //     ChildComponent
  //   }
  // })
  strats.el = strats.propsData = function (parent, child, vm, key) {
  // Sub.options = mergeOptions( 
  //   Super.options,
  //   extendOptions
  // )
    if (!vm) { // 子类调用mergeOptions是没有vm实例的
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    // el,propsData都将调用defaultStrat，默认策略有子取子的子值返回，否则取父的
    return defaultStrat(parent, child)
  }
}

/**
 * Helper that recursively merges two data objects together.
 */
function mergeData (to: Object, from: ?Object): Object {
  if (!from) return to
  let key, toVal, fromVal
  const keys = Object.keys(from)
  for (let i = 0; i < keys.length; i++) {
    key = keys[i]
    toVal = to[key]
    fromVal = from[key]
    // to中如何没有这个key给to加上这个key，并且将fromVal的值给to的key
    if (!hasOwn(to, key)) {
      set(to, key, fromVal)
    } else if (isPlainObject(toVal) && isPlainObject(fromVal)) {
      // 如果to,from的值是个对象就递归调用
      mergeData(toVal, fromVal)
    }
  }
  // 最后将from所有的key，value拷贝到to对象上
  return to
}

/**
 * Data
 */
export function mergeDataOrFn (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    // vue.extend的调用方式，childVal不存在返回parentVal
    //子里没有data     Vue.extend({})
    if (!childVal) {
      return parentVal
    }
    // parentVal不存在返回childVal
    // const Parent = Vue.extend({
    //   data: function () {
    //     return {
    //       test: 1
    //     }
    //   }
    // })
    // const Child = Parent.extend({})
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    // 当parentVal和childVal都存在时返回一个函数
    return function mergedDataFn () {
      // mergeData用来递归合并val
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    return function mergedInstanceDataFn () {
      // instance merge
      // new Vue的方式调用
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal
      if (instanceData) {
        // 拷贝数据
        return mergeData(instanceData, defaultData)
      } else {
        // 没有data返回parentData
        return defaultData
      }
    }
  }
}
// data的合并策略
strats.data = function (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    if (childVal && typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )

      return parentVal
    }
    // vue.extend调用方法没有vm实例
    return mergeDataOrFn(parentVal, childVal)
  }
  // 使用vm实例的调用方法
  return mergeDataOrFn(parentVal, childVal, vm)
}

/**
 * Hooks and props are merged as arrays.
 */
// 父子钩子相同合并,子的钩子存在父不存在用子的否则用父的钩子
function mergeHook (
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  return childVal
    ? parentVal
      ? parentVal.concat(childVal)
       // [
      //   created: function () {
      //     console.log('parentVal')
      //   },
      //   created: function () {
      //     console.log('childVal')
      //   }
      // ]
      : Array.isArray(childVal)
        ? childVal
        : [childVal]

//      new Vue({
//         created: [
//           function () {
//             console.log('first')
//           },
//           function () {
//             console.log('second')
//           },
//           function () {
//             console.log('third')
//           }
//         ]
//       })
    : parentVal
}
// 钩子函数的合并策略
LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */
// 在 Vue 中 directives、filters 以及 components 被认为是资源，
// 主要还是通过原型链进行继承，如果用户的componets有就用用户的，没有就用原型链继承内置的
function mergeAssets (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): Object {
  const res = Object.create(parentVal || null)
  if (childVal) {
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm)
    //res = {
    //   ChildComponent
    //   // 原型
    //   __proto__: {
    //     KeepAlive,
    //     Transition,
    //     TransitionGroup
    //   }
    // }
    return extend(res, childVal)
  } else {
    return res
  }
}
// assets的合并策略
ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.  watch的合并策略
 */
strats.watch = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  // work around Firefox's Object.prototype.watch...
  if (parentVal === nativeWatch) parentVal = undefined
  if (childVal === nativeWatch) childVal = undefined
  /* istanbul ignore if */
  if (!childVal) return Object.create(parentVal || null)
  if (process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal
  const ret = {}
  extend(ret, parentVal)
  for (const key in childVal) {
    let parent = ret[key]
    const child = childVal[key]
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    ret[key] = parent
      ? parent.concat(child)
      : Array.isArray(child) ? child : [child]
  }
  return ret
}

/**
 * Other object hashes. props,methods,inject,computed的合并策略
 */
strats.props =
strats.methods =
strats.inject =
strats.computed = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  if (childVal && process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal
  const ret = Object.create(null)
  extend(ret, parentVal)
  if (childVal) extend(ret, childVal)
  return ret
}
strats.provide = mergeDataOrFn

/**
 * Default strategy. 默认就是有儿子的值拿儿子的值，不然就拿父亲的值
 */
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * Validate component names
 */
//检查组件的命名合法性
function checkComponents (options: Object) {
  // 循环检查options.components里的组件是不是合法的命名
  for (const key in options.components) {
    validateComponentName(key)
  }
}
//真正检测组件命名合法性方法，检查格式和是不是内置标签
export function validateComponentName (name: string) {
  if (!/^[a-zA-Z][\w-]*$/.test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'can only contain alphanumeric characters and the hyphen, ' +
      'and must start with a letter.'
    )
  }
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    )
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
/**
 * const ChildComponent = {
      props: ['someData']
    }

    const ChildComponent = {
      props: {
        someData: {
          type: Number,
          default: 0
        }
      }
}
 */
function normalizeProps (options: Object, vm: ?Component) { // 用户传入的options, 当前vm实例
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  // const ChildComponent = {
  //   props: ['someData']
  // }
  // 如果当前props是个数组
  if (Array.isArray(props)) {
    i = props.length
    // 倒着拿
    while (i--) {
      // 拿到props中的属性
      val = props[i]
      // props中的属性是字符串转成驼峰规范
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
        // res = {
        //   someData: { type: null }
         // }
      } else if (process.env.NODE_ENV !== 'production') { // 如果不是字符串则报错
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
//     props是对象的情况
//     const ChildComponent = {
//       props: {
//         someData: {
//           type: Number,
//           default: 0
//         }
//      }
    for (const key in props) {
      val = props[key]
      //连字符转驼峰
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
      // res = {
      // someData: {
     //    type: Number
      //}
      //}
    }
  } else if (process.env.NODE_ENV !== 'production') { // 既不是数组也不是对象报错
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  //都格式化为{}形式, { type: xxx }的形式
  options.props = res
}

/**
 * Normalize all injections into Object-based format
 */
/*
  // 子组件
const ChildComponent = {
  template: '<div>child component</div>',
  created: function () {
    console.log(this.d)
  },
  // 对象的语法类似于允许我们为注入的数据声明一个别名
  inject: {
    d: 'data'
  }
}
*/
function normalizeInject (options: Object, vm: ?Component) {
  // 拿到用户的.inject
  const inject = options.inject
  if (!inject) return
  // {}
  const normalized = options.inject = {}
  // inject是数组的情况
  // 子组件
  // const ChildComponent = {
  //   template: '<div>child component</div>',
  //   created: function () {
  //     // 这里的 data 是父组件注入进来的
  //     console.log(this.data)
  //   },
  //   inject: ['data']
  // }

  // // 父组件
  // var vm = new Vue({
  //   el: '#app',
  //   // 向子组件提供数据
  //   provide: {
  //     data: 'test provide'
  //   },
  //   components: {
  //     ChildComponent
  //   }
  // })
  if (Array.isArray(inject)) {
    for (let i = 0; i < inject.length; i++) {
//     inject: {
//   'data1': { from: 'data1' },
//   'data2': { from: 'data2' }
// }
      normalized[inject[i]] = { from: inject[i] }
    }
  } else if (isPlainObject(inject)) { // inject是对象的情况
    // 子组件
    // const ChildComponent = {
    //   template: '<div>child component</div>',
    //   created: function () {
    //     console.log(this.d)
    //   },
    //   // 对象的语法类似于允许我们为注入的数据声明一个别名
    //   inject: {
    //     d: 'data'
    //   }
    // }
    for (const key in inject) { 
      const val = inject[key]
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val }
//     inject: {
//   'data1': { from: 'data1' },
//   'd2': { from: 'data2' },
//   'data3': { from: 'data3', someProperty: 'someValue' }
// }
    }
  } else if (process.env.NODE_ENV !== 'production') { // 报错
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
  // 最后将ineject 规范化为 data1: { from: xxx}
}

/**
 * Normalize raw function directives into object format.
 */
/**
 * var vm = new Vue({
  el: '#app',
  data: {
    test: 1
  },
  // 注册两个局部指令
  directives: {
    test1: {
      bind: function () {
        console.log('v-test1')
      }
    },
    test2: function () {
      console.log('v-test2')
    }
  }
})
 */
function normalizeDirectives (options: Object) {
//   <div id="app" v-test1 v-test2>{{test}}</div>

// var vm = new Vue({
//   el: '#app',
//   data: {
//     test: 1
//   },
//   // 注册两个局部指令
//   directives: {
//     test1: {
//       bind: function () {
//         console.log('v-test1')
//       }
//     },
//     test2: function () {
//       console.log('v-test2')
//     }
//   }
// })
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      // 如果指令是函数规范化为对象
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
// 规范化为 {test1: {bind(){}, update(){}}}
}

function assertObjectType (name: string, value: any, vm: ?Component) {
  if (!isPlainObject(value)) {
    warn(
      `Invalid value for option "${name}": expected an Object, ` +
      `but got ${toRawType(value)}.`,
      vm
    )
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 
 1. new Vue的时候调用
 2. Vue.extend的时候调用
 // vm.$options = {
//     parent: Vue /*父Vue实例*/,
//     propsData: undefined,
//     _componentTag: undefined,
//     _parentVnode: VNode /*父VNode实例*/,
//     _renderChildren:undefined,
//     __proto__: {
//       components: { },
//       directives: { },
//       filters: { },
//       _base: function Vue(options) {
//           //...
//       },
//       _Ctor: {},
//       created: [
//         function created() {
//           console.log('parent created')
//         }, function created() {
//           console.log('child created')
//         }
//       ],
//       mounted: [
//         function mounted() {
//           console.log('child mounted')
//         }
//       ],
//       data() {
//          return {
//            msg: 'Hello Vue'
//          }
//       },
//       template: '<div>{{msg}}</div>'
//     }
//   }

**/

// vm.$options = mergeOptions(
//   // resolveConstructorOptions(vm.constructor)
//   {
//     components: {
//       KeepAlive
//       Transition,
//       TransitionGroup
//     },
//     directives:{
//       model,
//       show
//     },
//     filters: Object.create(null),
//     _base: Vue
//   },
//   // options || {}
//   {
//     el: '#app',
//     data: {
//       test: 1
//     }
//   },
//   vm
// )
// 主要作用就是根据2个对象的key采用不同的策略进行合并最终返回合并后的配置
export function mergeOptions (
  parent: Object, // 父options自带的options
  child: Object, // 子options用户传入的
  vm?: Component // 当前实例
): Object {
  if (process.env.NODE_ENV !== 'production') {
    // 1. 检查组件子类options是不是个组件，1.1检查options.components里的命名是否规范，1.2检查是不是内置的标签命名
    checkComponents(child)
  }
    //2.  如果这个options是个方法，通过方法的.options拿到用户的options
  if (typeof child === 'function') {
    child = child.options
  }
  //规范化
  // 3. props的多种写法
  // const ChildComponent = {
  //   props: ['someData']
  // }
  // const ChildComponent = {
  //   props: {
  //     someData: {
  //       type: Number,
  //       default: 0
  //     }
  //   }
  // }
  normalizeProps(child, vm) // {type: xxx}
  normalizeInject(child, vm) // {from: xxx}
  normalizeDirectives(child) // {bind: xxx, update:xxx}
  
  // 用户的extend
  const extendsFrom = child.extends
  if (extendsFrom) {
    // 将子extend传入作为options进行进行
    parent = mergeOptions(parent, extendsFrom, vm)
  }
  // 用户的mixins
// const consoleMixin = {
//   created () {
//     console.log('created:mixins')
//   }
// }

// new Vue ({
//   mixins: [consoleMixin],
//   created () {
//     console.log('created:instance')
//   }
// })
  if (child.mixins) {
    for (let i = 0, l = child.mixins.length; i < l; i++) {
      // 把mixin中的配置取出来与parent配置进行合并，记录返回后的结果，下次与合并后的parent继续进行合并
      parent = mergeOptions(parent, child.mixins[i], vm)
    }
  }
  // 规范化后进行合并options
  const options = {}
  let key
  // 循环parent中的key进行合并
  //   Vue.options = {
  //   components: {
  //       KeepAlive,
  //       Transition,
  //       TransitionGroup
  //   },
  //   directives:{
  //       model,
  //       show
  //   },
  //   filters: Object.create(null),
  //   _base: Vue
  // }
  for (key in parent) {
    mergeField(key)
  }
  // 循环child中的key进行合并
  for (key in child) {
    // 如果 child 对象的键也在 parent 上出现，那么就不要再调用 mergeField 了，因为在上一个 for in 循环中已经调用过了，这就避免了重复调用。
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  // 具体的合并操作
  function mergeField (key) {
    // 根据key取到对应的合并策略的方法，没有取到就使用默认的合并方法
    const strat = strats[key] || defaultStrat
    // 调用对应key的合并策略方法，最终将合并后的结果赋值给当前key
    options[key] = strat(parent[key], child[key], vm, key)
  }
  // 拿到规范化后的options与父子组件合并后的options
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
// components, directive, filter都属于asset = options[type][id]

export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  // 先通过 const assets = options[type] 拿到 assets，然后再尝试拿 assets[id]
  const assets = options[type]
  // check local registration variations first
  // 这里有个顺序，先直接使用 id 拿，如果不存在
  if (hasOwn(assets, id)) return assets[id]
  // 则把 id 变成驼峰的形式再拿
  const camelizedId = camelize(id)
  // 如果仍然不存在则在驼峰的基础上
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  // 把首字母再变成大写的形式再拿
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // fallback to prototype chain
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
   // 如果仍然拿不到则报错。
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
