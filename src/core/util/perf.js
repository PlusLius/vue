import { inBrowser } from './env'

export let mark
export let measure

if (process.env.NODE_ENV !== 'production') {
  /**
   * 如果在浏览器环境，那么 perf 的值就是 window.performance，否则为 false，然后做了一系列判断，目的是确定 performance 的接口可用，如果都可用，那么将初始化 mark 和 measure 变量。
   */
  const perf = inBrowser && window.performance
  /* istanbul ignore if */
  if (
    perf &&
    perf.mark &&
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    //通过 performance.mark() 方法打一个标记。
    mark = tag => perf.mark(tag)
    //measure 方法触发标记
    measure = (name, startTag, endTag) => {
      perf.measure(name, startTag, endTag)
      perf.clearMarks(startTag)
      perf.clearMarks(endTag)
      perf.clearMeasures(name)
    }
  }
}
