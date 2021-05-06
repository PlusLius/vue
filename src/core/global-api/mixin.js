/* @flow */

import { mergeOptions } from '../util/index'
// // 为自定义的选项 'myOption' 注入一个处理器。
// Vue.mixin({
//   created: function () {
//     var myOption = this.$options.myOption
//     if (myOption) {
//       console.log(myOption)
//     }
//   }
// })

// new Vue({
//   myOption: 'hello!'
// })
// // => "hello!"
export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    // 当前根实例的options, 和需要在全局混入的mixin, 实际修改的是全局的options
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
