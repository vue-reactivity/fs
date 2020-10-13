<p align='center'>
<img src='https://github.com/vue-reactivity/art/blob/master/svg/package-fs.svg?raw=true' height='250'>
</p>

<p align='center'>
Reactive filesystem powered by <a href="https://github.com/vuejs/vue-next/tree/master/packages/reactivity"><code>@vue/reactivity</code></a>
</p>

<p align='center'>
  <a href="https://www.npmjs.com/package/@vue-reactivity/fs"><img src="https://img.shields.io/npm/v/@vue-reactivity/fs?color=43b883&label=" alt="npm"></a>
  <a href="https://bundlephobia.com/result?p=@vue-reactivity/fs"><img src="https://img.shields.io/bundlephobia/minzip/@vue-reactivity/fs?color=364a5e&label=" alt="npm bundle size"></a>
</p>

## Install

<pre>
npm i @vue-reactivity/<b>fs</b>
</pre>

### Usage

> Work only in  Node.js

```ts
import { useFile } from '@vue-reactivity/fs'

const fileRef = useFile('messages.txt')

await fileRef.waitForReady()

console.log(fileRef.value) // output file content

fileRef.value += 'Hello World' // append to file

fileRef.value = 'Good Morning' // write to file
```

Watch for file changes (via [`chokidar`](https://github.com/paulmillr/chokidar))

```ts
const fileRef = useFile('messages.txt', { watchFileChanges: true })
```

`useJson`

```ts
import { useJSON } from '@vue-reactivity/fs'

const data = useJSON('data.json', { initialValue: { foo: 'bar' }})

console.log(data.value) // { foo: 'bar' }

data.value = { bar: 'foo' } // write to json file
```

Custom serializer

```ts
import YAML from 'js-yaml'
import { useFileWithSerializer } from '@vue-reactivity/fs'

export function useYAML<T>(path: string, options: JSONSerializerOptions<T> = {}) {
  return useFileWithSerializer<T>(
    path,
    {
      ...options,
      serialize: v => YAML.safeDump(v)
      deserialize: v => YAML.safeLoad(v),
    },
  )
}
```

## License

MIT
