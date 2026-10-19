import { describe, expect, it } from 'vitest'
import { inAppBrowser } from '../firebase'
import { openInBrowserHow } from '../../features/device/InAppNotice'

const iosSafari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const iosChrome = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1'
const iosWebView = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const androidChrome = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
const androidWebView = 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36'
const desktop = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'

describe('inAppBrowser', () => {
  it('names the common apps', () => {
    expect(inAppBrowser(iosSafari + ' Line/14.0.0')).toBe('line')
    expect(inAppBrowser(iosWebView + ' Barcelona 300.0.0.0')).toBe('threads')
    expect(inAppBrowser(iosWebView + ' Instagram 300.0.0')).toBe('instagram')
    expect(inAppBrowser(iosWebView + ' [FBAN/MessengerForiOS;FBAV/400.0]')).toBe('messenger')
    expect(inAppBrowser(iosWebView + ' [FBAN/FBIOS;FBAV/400.0]')).toBe('facebook')
    expect(inAppBrowser(iosWebView + ' MicroMessenger/8.0')).toBe('wechat')
    expect(inAppBrowser(androidWebView + ' musical_ly_2023')).toBe('tiktok')
    expect(inAppBrowser(iosWebView + ' Twitter for iPhone')).toBe('x')
  })
  it('catches unnamed in-app web views by the generic rule', () => {
    expect(inAppBrowser(iosWebView)).toBe('webview')
    expect(inAppBrowser(androidWebView)).toBe('webview')
  })
  it('leaves real browsers alone', () => {
    for (const ua of [iosSafari, iosChrome, androidChrome, desktop, '']) expect(inAppBrowser(ua)).toBeNull()
  })
})

describe('openInBrowserHow', () => {
  it('says Safari on iPhone and Chrome on Android', () => {
    expect(openInBrowserHow('threads', false)).toContain('在 Safari 中開啟')
    expect(openInBrowserHow('threads', true)).toContain('在 Chrome 中開啟')
    expect(openInBrowserHow('line', false)).toContain('按下面的按鈕')
    expect(openInBrowserHow('webview', false)).toContain('複製網址')
  })
})
