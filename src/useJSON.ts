import { SerializerBaseOptions, useFileWithSerializer } from './useFileWithSerializer'

export type JSONSerializerOptions<T> = SerializerBaseOptions<T> & {
  space?: number | string
}

export function useJSON<T>(path: string, { space, ...options }: JSONSerializerOptions<T> = {}) {
  return useFileWithSerializer<T>(
    path,
    {
      ...options,
      serialize: v => `${JSON.stringify(v, null, space)}\n`,
      deserialize: v => JSON.parse(v),
    },
  )
}
