import path from 'path'
import test from 'ava'
import fs from 'fs-extra'
import { toRefs } from '@vue/reactivity'
import { when } from '@vue-reactivity/when'
import { useJSON } from '../src'

const TEMP_DIR = path.resolve(__dirname, 'temp')

test('useJSON', async(t) => {
  await fs.ensureDir(TEMP_DIR)
  const TEST_FILE_PATH = path.join(TEMP_DIR, 'test.json')
  if (fs.existsSync(TEST_FILE_PATH))
    await fs.unlink(TEST_FILE_PATH)

  const data = useJSON<any>(TEST_FILE_PATH, {
    initialValue: { hello: 'world' },
    watchFileChanges: true
  })
  t.deepEqual(data.value, { hello: 'world' })
  t.is(data.file.info.existed, false)

  const { lastUpdate } = toRefs(data.file.info)
  const forChanges = (n = 1) => when(lastUpdate).changedTimes(n, { timeout: 1000 })

  // update json
  data.value = { foo: 'bar' }

  await forChanges()

  t.is(data.file.info.existed, true)
  t.deepEqual(data.value, { foo: 'bar' })
  t.deepEqual(JSON.parse(await fs.readFile(TEST_FILE_PATH, 'utf-8')), { foo: 'bar' })

  // should not update
  data.value.foo = 'bar2'
  await forChanges()
  t.deepEqual(JSON.parse(await fs.readFile(TEST_FILE_PATH, 'utf-8')), { foo: 'bar2' })

  // file changes
  await fs.writeJSON(TEST_FILE_PATH, { v: true })
  await forChanges()
  t.deepEqual(data.value, { v: true })
})
