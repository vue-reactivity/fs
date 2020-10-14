import { watch } from '@vue-reactivity/watch'
import { ref, Ref } from '@vue/reactivity'
import { ReactiveFileRef, useFile, UseFileOptions } from './useFile'

export type SerializerBaseOptions<T> = UseFileOptions & {
  initialValue?: T
  throttle?: number
  deep?: boolean
}

export type SerializerOptions<T> = SerializerBaseOptions<T> & {
  serialize: (v: T) => string | Promise<string>
  deserialize: (v: string) => T | Promise<T>
}

export type ReactiveSerializedFileRef<T> = Ref<T> & {
  file: ReactiveFileRef
  waitForReady: () => Promise<ReactiveSerializedFileRef<T>>
  readonly ready: boolean
  stop: () => void
}

export function useFileWithSerializer<T>(path: string, options: SerializerOptions<T>): ReactiveSerializedFileRef<T>
export function useFileWithSerializer<T>(path: string, options: SerializerOptions<T> & { initialValue?: undefined }): ReactiveSerializedFileRef<T | undefined>
export function useFileWithSerializer<T>(path: string, options: SerializerOptions<T>) {
  const { initialValue, serialize, deserialize, deep = true } = options
  const file = useFile(path, options)
  let lock = false

  const serialized = ref(initialValue) as unknown as ReactiveSerializedFileRef<T | undefined>

  const subs = [file.stop]

  subs.push(
    watch(
      file,
      async() => {
        lock = true
        serialized.value = file.value ? await deserialize(file.value) : initialValue
        lock = false
      },
    ),
  )

  subs.push(
    watch(
      serialized,
      async() => {
        if (lock)
          return
        file.value = serialized.value ? (await serialize(serialized.value)) : null
      },
      { deep },
    ),
  )

  function stop() {
    subs.forEach(i => i && i())
  }

  const waitForReady = file.waitForReady().then(() => serialized)

  Object.defineProperty(serialized, 'file', { value: file })
  Object.defineProperty(serialized, 'stop', { value: stop })
  Object.defineProperty(serialized, 'waitForReady', { value: waitForReady })
  Object.defineProperty(serialized, 'ready', { get: () => file.ready })

  return serialized
}
