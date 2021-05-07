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
//   它的实现实际上非常简单，就是把要混入的对象通过 mergeOptions 合并到 Vue 的 options 中，
//   由于每个组件的构造函数都会在 extend 阶段合并 Vue.options 到自身的 options 中，
//   所以也就相当于每个组件都定义了 mixin 定义的选项。
  Vue.mixin = function (mixin: Object) {
    // 当前根实例的options, 和需要在全局混入的mixin, 实际修改的是全局的options
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
