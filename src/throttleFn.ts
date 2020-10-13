
export const throttleFn = <T extends Function>(func: T, limit: number): T => {
  let inThrottle = false
  function wrapper(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
  return wrapper as any as T
}
