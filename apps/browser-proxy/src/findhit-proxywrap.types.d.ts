module 'findhit-proxywrap' {
  const module = {
    proxy: (net: typeof import('node:net')) => typeof net,
  }
  export default module
}
