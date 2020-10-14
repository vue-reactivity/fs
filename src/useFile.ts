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
  waitForReady: () => Promise<ReactiveFileRef>
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

  const info = reactive<ReactiveFileInfo>({
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
      info.existed = false
      info.content = null
    }
    else {
      info.existed = true
      const content = await fsp.readFile(path, encoding)
      const stats = await fsp.stat(path)
      info.content = content
      info.stats = stats
    }
    info.lastUpdate = +new Date()
  }

  async function writeNow(text: string) {
    info.content = text
    info.existed = true
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

  const file = computed<string | null>({
    get() {
      return info.content
    },
    set(v: string | null) {
      if (v == null) info.remove()
      else write(v)
    },
  }) as unknown as ReactiveFileRef

  const _readyPromise = readNow()
    .then(() => {
      ready = true
      return file
    })

  const waitForReady = () => _readyPromise

  Object.defineProperty(file, 'info', { value: readonly(info) })
  Object.defineProperty(file, 'waitForReady', { value: waitForReady })
  Object.defineProperty(file, 'ready', { get: () => ready })
  Object.defineProperty(file, 'stop', { value: stop })

  return file
}
