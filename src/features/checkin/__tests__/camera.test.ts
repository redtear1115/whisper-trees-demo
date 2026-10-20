import { describe, expect, it } from 'vitest'
import { allowSteps, cameraHelp, classifyCameraError, detectPlatform, shouldRetryAnyCamera } from '../camera'

const err = (name: string) => Object.assign(new Error(name), { name })
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

describe('classifyCameraError', () => {
  it('maps getUserMedia errors to problems', () => {
    expect(classifyCameraError(err('NotAllowedError'))).toBe('denied')
    expect(classifyCameraError(err('PermissionDeniedError'))).toBe('denied')
    expect(classifyCameraError(err('NotFoundError'))).toBe('notFound')
    expect(classifyCameraError(err('OverconstrainedError'))).toBe('notFound')
    expect(classifyCameraError(err('NotReadableError'))).toBe('busy')
    expect(classifyCameraError(err('Whatever'))).toBe('unknown')
    expect(classifyCameraError(null)).toBe('unknown')
  })
  it('retries with any camera only when the back camera is missing', () => {
    expect(shouldRetryAnyCamera(err('OverconstrainedError'))).toBe(true)
    expect(shouldRetryAnyCamera(err('NotFoundError'))).toBe(true)
    expect(shouldRetryAnyCamera(err('NotAllowedError'))).toBe(false)
  })
})

describe('detectPlatform', () => {
  it('tells iPhone Safari, iPhone Chrome and Android apart', () => {
    expect(detectPlatform(IPHONE, null)).toMatchObject({ ios: true, android: false, iosChrome: false })
    expect(detectPlatform(IPHONE_CHROME, null)).toMatchObject({ ios: true, iosChrome: true })
    expect(detectPlatform(ANDROID, null)).toMatchObject({ ios: false, android: true })
  })
})

describe('cameraHelp', () => {
  const iphone = detectPlatform(IPHONE, null)
  const android = detectPlatform(ANDROID, null)

  it('denied: platform steps, retry, and always the photo fallback', () => {
    const h = cameraHelp('denied', iphone)
    expect(h.title).toContain('相機權限')
    expect(h.steps[0]).toContain('網站設定')
    expect(h.steps.at(-1)).toContain('從相簿選照片')
    expect(h.retry).toBe(true)
    expect(cameraHelp('denied', android).steps[0]).toContain('權限')
  })
  it('iPhone Chrome points to the iOS settings for Chrome', () => {
    expect(allowSteps(detectPlatform(IPHONE_CHROME, null))[0]).toContain('「Chrome」')
  })
  it('black screen (noFrames) suggests retry, closing other camera apps, and permission', () => {
    const h = cameraHelp('noFrames', android)
    expect(h.title).toContain('沒有畫面')
    expect(h.steps.join('')).toContain('其他 App')
    expect(h.steps.join('')).toContain('權限')
    expect(h.retry).toBe(true)
  })
  it('in-app browsers: ask to switch browser first, no retry', () => {
    const h = cameraHelp('noFrames', detectPlatform(IPHONE, 'line'))
    expect(h.title).toContain('LINE')
    expect(h.steps[0]).toContain('Safari')
    expect(h.retry).toBe(false)
  })
  it('every problem ends with the photo fallback', () => {
    for (const p of ['denied', 'notFound', 'busy', 'insecure', 'unsupported', 'noFrames', 'unknown'] as const)
      expect(cameraHelp(p, android).steps.at(-1)).toContain('從相簿選照片')
  })
})
