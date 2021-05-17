/* @flow */

import {
  isPreTag,
  mustUseProp,
  isReservedTag,
  getTagNamespace
} from '../util/index'
// export default [
//   klass,
//   style,
//   model
// ]
// 运行时环境的style,class
import modules from './modules/index'
// export default {
//   model,
//   text,
//   html
// }
// 运行时环境内置的model,text,html
import directives from './directives/index' 
import { genStaticKeys } from 'shared/util'
import { isUnaryTag, canBeLeftOpenTag } from './util'

export const baseOptions: CompilerOptions = {
  expectHTML: true,
  modules,
  directives,
  isPreTag,
  isUnaryTag,
  mustUseProp,
  canBeLeftOpenTag,
  isReservedTag,
  getTagNamespace,
  staticKeys: genStaticKeys(modules)
}
