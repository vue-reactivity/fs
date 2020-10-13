import path from 'path'
import test from 'ava'
import fs from 'fs-extra'
import { toRefs } from '@vue/reactivity'
import { when } from '@vue-reactivity/when'
import { useFile } from '../src'

const TEMP_DIR = path.resolve(__dirname, 'temp')

test('useFile', async(t) => {
  await fs.ensureDir(TEMP_DIR)
  const TEST_FILE_PATH = path.join(TEMP_DIR, 'test.txt')
  await fs.writeFile(TEST_FILE_PATH, 'test', 'utf-8')

  const file = useFile(TEST_FILE_PATH, { watchFileChanges: true })

  const { lastUpdate } = toRefs(file.info)
  const forChanges = () => when(lastUpdate).changed({ timeout: 1000 })

  // init
  t.is(file.info.encoding, 'utf-8')
  t.is(file.info.path, TEST_FILE_PATH)
  t.is(file.info.existed, true)
  t.is(file.info.content, null)

  // on load
  await file.waitForReady()
  t.is(file.value, 'test')

  // file content update
  fs.writeFile(TEST_FILE_PATH, 'test2', 'utf-8')

  await forChanges()

  t.is(file.value, 'test2')

  // remove file
  fs.remove(TEST_FILE_PATH)
  await forChanges()

  t.is(file.value, null)
  t.is(file.info.existed, false)

  // write back 1
  await file.info.setContent('test3')

  t.is(file.value, 'test3')
  t.is('test3', await fs.readFile(TEST_FILE_PATH, 'utf-8'))

  // write back 2
  t.is(file.value, 'test3')
  file.value = 'test4'

  await forChanges()

  t.is(file.value, 'test4')
  t.is('test4', await fs.readFile(TEST_FILE_PATH, 'utf-8'))
})
