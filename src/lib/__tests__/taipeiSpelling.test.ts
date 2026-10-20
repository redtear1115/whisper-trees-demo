import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// 使用者看得到的文字：一般的「台北」寫成「臺北」，只有專有名稱（台北市政 Debug 松、台北市網路公祭網站）保留原名。
// 註解不算（工程註解可以寫台北）。
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : sources(p)
    return /\.(tsx?)$/.test(name) && !/\.test\./.test(name) ? [p] : []
  })
}

describe('臺北 spelling in UI text', () => {
  it('has no generic 台北 outside comments and proper names', () => {
    const bad: string[] = []
    for (const file of sources(join(process.cwd(), 'src'))) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/^\s*(\/\/|\*|\/\*)/.test(line)) return
          const code = line.replace(/\/\/.*$/, '').replace('台北市政 Debug 松', '').replace('台北市網路公祭網站', '')
          if (code.includes('台北')) bad.push(`${file}:${i + 1}`)
        })
    }
    expect(bad).toEqual([])
  })
})
