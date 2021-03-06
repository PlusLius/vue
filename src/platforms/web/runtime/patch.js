/* @flow */

import * as nodeOps from 'web/runtime/node-ops' // 提供平台相关的接口方法
import { createPatchFunction } from 'core/vdom/patch' // patch方法接收平台相关的接口方法和其他的一些内置指令和平台内置指令方法
import baseModules from 'core/vdom/modules/index' // 提供了ref钩子和一些指令钩子
import platformModules from 'web/runtime/modules/index' // 平台指令相关的指令，例如browser的class,style等指令钩子

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules) //将内置钩子和平台内置指令钩子合并
// 该方法的定义是调用 createPatchFunction 方法的返回值，这里传入了一个对象，
// 包含 nodeOps 参数和 modules 参数。其中，nodeOps 封装了一系列 DOM 操作的方法
// modules 定义了一些模块的钩子函数的实现
export const patch: Function = createPatchFunction({ nodeOps, modules })
