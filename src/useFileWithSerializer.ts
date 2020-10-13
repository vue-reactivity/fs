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
  stop: () => void
}

export function useFileWithSerializer<T>(path: string, options: SerializerOptions<T>): ReactiveSerializedFileRef<T>
export function useFileWithSerializer<T>(path: string, options: SerializerOptions<T> & { initialValue?: undefined }): ReactiveSerializedFileRef<T | null>
export function useFileWithSerializer<T>(path: string, options: SerializerOptions<T>) {
  const { initialValue, serialize, deserialize, deep = true } = options
  const file = useFile(path, options)
  let lock = false

  const serialized = ref(initialValue) as Ref<T | undefined>

  const subs = [file.stop]

  subs.push(
    watch(
      file,
      async() => {
        lock = true
        serialized.value = file.value ? await deserialize(file.value) : initialValue
        lock = false
      }
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

  Object.defineProperty(serialized, 'file', { value: file })
  Object.defineProperty(serialized, 'stop', { value: stop })

  return serialized as unknown as ReactiveSerializedFileRef<T>
}
