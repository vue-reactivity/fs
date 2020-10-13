import fs, { promises as fsp } from 'fs'
import { computed, reactive, readonly, Ref } from '@vue/reactivity'
import chokidar from 'chokidar'
import { throttleFn } from './throttleFn'

export interface ReactiveFileInfo {
  path: string
  encoding: string
  existed: boolean | null
  content: string | null
  lastUpdate: number
  stats?: fs.Stats
  setContent: (content: string) => Promise<void>
  remove: () => Promise<void>
}

export type ReactiveFileRef = Ref<string | null> & {
  info: Readonly<ReactiveFileInfo>
  waitForReady: () => Promise<void>
  readonly ready: boolean
  stop: () => void
}

export interface UseFileOptions {
  encoding?: BufferEncoding
  throttle?: number
  watchFileChanges?: boolean
}

export function useFile(path: string, options: UseFileOptions = {}) {
  const { encoding = 'utf-8', throttle } = options

  let ready = false
  const read = throttle == null ? readNow : throttleFn(readNow, throttle)
  const write = throttle == null ? writeNow : throttleFn(writeNow, throttle)

  const file = reactive<ReactiveFileInfo>({
    path,
    encoding,
    existed: null,
    content: null,
    lastUpdate: -1,
    setContent: writeNow,
    remove,
  })

  async function readNow() {
    if (!fs.existsSync(path)) {
      file.existed = false
      file.content = null
    } else {
      file.existed = true
      const content = await fsp.readFile(path, encoding)
      const stats = await fsp.stat(path)
      file.content = content
      file.stats = stats
    }
    file.lastUpdate = +new Date()
  }

  async function writeNow(text: string) {
    file.content = text
    file.existed = true
    await fsp.writeFile(path, text, encoding)
  }

  async function remove() {
    await fsp.unlink(path)
  }

  let stop = () => {}

  if (options.watchFileChanges) {
    const watcher = chokidar
      .watch(path, { ignoreInitial: true })
      .on('add', read)
      .on('change', read)
      .on('unlink', read)

    stop = () => watcher.close()
  }

  let _readyPromise = readNow().then(() => (ready = true))

  const content = computed<string | null>({
    get() {
      return file.content
    },
    set(v: string | null) {
      if (v == null) file.remove()
      else write(v)
    },
  })

  const waitForReady = () => _readyPromise

  Object.defineProperty(content, 'info', { value: readonly(file) })
  Object.defineProperty(content, 'waitForReady', { value: waitForReady })
  Object.defineProperty(content, 'ready', { get: () => ready })
  Object.defineProperty(content, 'stop', { value: stop })

  return (content as unknown) as ReactiveFileRef
}
