// Firebase 初始化、匿名登入與 Google 綁定。只有設了 VITE_FIREBASE_*（或 VITE_FIREBASE_EMULATOR=1）才啟用；
// 沒設就完全不碰 Firebase，store 走 localStorage 後端。Vitest 的 MODE 是 'test'，一律走本機。

import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  type Firestore,
} from 'firebase/firestore'
import { useSyncExternalStore } from 'react'

const env = import.meta.env

export const USE_EMULATOR = env.VITE_FIREBASE_EMULATOR === '1'

/** 是否啟用雲端後端 */
export const firebaseEnabled: boolean =
  env.MODE !== 'test' &&
  (USE_EMULATOR || Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID))

// ---------- 初始化 ----------

let app: FirebaseApp | null = null
let authInst: Auth | null = null
let dbInst: Firestore | null = null

function config() {
  // 模擬器用假設定，不管環境變數裡有沒有真專案的設定，避免誤連正式專案
  if (USE_EMULATOR)
    return { apiKey: 'demo-api-key', authDomain: 'demo-whisper-trees.firebaseapp.com', projectId: 'demo-whisper-trees', appId: 'demo-app-id' }
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }
}

export function getFirebase(): { auth: Auth; db: Firestore } {
  if (!app) {
    app = initializeApp(config())
    authInst = getAuth(app)
    dbInst = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    })
    if (USE_EMULATOR) {
      const host = location.hostname || '127.0.0.1'
      connectAuthEmulator(authInst, `http://${host}:9099`, { disableWarnings: true })
      connectFirestoreEmulator(dbInst, host, 8080)
    }
  }
  return { auth: authInst!, db: dbInst! }
}

// ---------- 登入狀態（外部 store，React 用 useAuth 讀） ----------

export interface AuthSnap {
  status: 'off' | 'loading' | 'ready' | 'failed'
  uid: string | null
  isAnonymous: boolean
  /** 已綁定 Google */
  google: boolean
}

let snap: AuthSnap = { status: firebaseEnabled ? 'loading' : 'off', uid: null, isAnonymous: true, google: false }
const authListeners = new Set<() => void>()

function setSnap(next: AuthSnap) {
  if (next.status === snap.status && next.uid === snap.uid && next.isAnonymous === snap.isAnonymous && next.google === snap.google) return
  snap = next
  authListeners.forEach((l) => l())
}

export const getAuthSnap = () => snap
export function subscribeAuth(l: () => void) {
  authListeners.add(l)
  return () => authListeners.delete(l)
}
export function useAuth(): AuthSnap {
  return useSyncExternalStore(subscribeAuth, getAuthSnap)
}

function fromUser(u: User | null): AuthSnap {
  return {
    status: 'ready',
    uid: u?.uid ?? null,
    isAnonymous: u?.isAnonymous ?? true,
    google: !!u?.providerData.some((p) => p.providerId === 'google.com'),
  }
}

let started = false

/** 開始監看登入狀態；沒登入就匿名登入。登入失敗時 onFail 會被呼叫（store 據此退回本機模式）。 */
export function startAuth(onFail: (e: unknown) => void) {
  if (started || !firebaseEnabled) return
  started = true
  const { auth } = getFirebase()
  onAuthStateChanged(auth, (u) => {
    if (u) setSnap(fromUser(u))
  })
  auth
    .authStateReady()
    .then(async () => {
      if (!auth.currentUser) await signInAnonymously(auth)
      setSnap(fromUser(auth.currentUser))
    })
    .catch((e) => {
      setSnap({ status: 'failed', uid: null, isAnonymous: true, google: false })
      onFail(e)
    })
}

// ---------- Google 綁定 ----------

export type GoogleResult = 'linked' | 'switched' | 'cancelled' | 'error'

/**
 * 用 Google 保留紀錄。重要：popup 要在使用者點擊的同一個同步呼叫裡開（iOS Safari 否則會擋），
 * 所以這個函式在 linkWithPopup 之前不能有任何 await，也不能動態 import。
 * 目前是匿名帳號就綁定（紀錄跟著走）；Google 帳號已經有別的紀錄就切過去，這台的匿名紀錄不會合併。
 */
export function linkGoogle(): Promise<GoogleResult> {
  const { auth } = getFirebase()
  const provider = new GoogleAuthProvider()
  const user = auth.currentUser
  const popup = user ? linkWithPopup(user, provider) : signInWithPopup(auth, provider)
  return popup
    .then((): GoogleResult => {
      // linkWithPopup 不會觸發 onAuthStateChanged，自己更新一次登入狀態（承辦人檢查靠它）
      setSnap(fromUser(auth.currentUser))
      return 'linked'
    })
    .catch(async (e: { code?: string }): Promise<GoogleResult> => {
      if (e.code === 'auth/credential-already-in-use') {
        const credential = GoogleAuthProvider.credentialFromError(e as never)
        if (credential) {
          await signInWithCredential(auth, credential)
          setSnap(fromUser(auth.currentUser))
          return 'switched'
        }
      }
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return 'cancelled'
      console.warn('[auth] Google 登入失敗', e.code)
      return 'error'
    })
}

export type InAppBrowser = 'line' | 'threads' | 'instagram' | 'messenger' | 'facebook' | 'wechat' | 'tiktok' | 'x' | 'webview'

/**
 * App 內建瀏覽器（LINE、Threads、IG、FB…）：擋 Google 登入，相機、定位、加到主畫面也常常不能用，要請使用者改用 Safari／Chrome。
 * 先認名字；認不出名字的，用通用規則：iPhone 上沒有「Safari/」字樣、Android 上有「; wv)」都是內建的 WebView。
 */
export function inAppBrowser(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): InAppBrowser | null {
  if (/\bLine\//i.test(ua)) return 'line'
  if (/Barcelona/i.test(ua)) return 'threads' // Threads App 的內建瀏覽器代號
  if (/Instagram/i.test(ua)) return 'instagram'
  if (/MicroMessenger/i.test(ua)) return 'wechat' // 要排在 Messenger 前面：字串裡也有 Messenger
  if (/Messenger/i.test(ua)) return 'messenger'
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook'
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return 'tiktok'
  if (/Twitter/i.test(ua)) return 'x'
  const ios = /iPhone|iPad|iPod/i.test(ua)
  if (ios && !/Safari\//i.test(ua)) return 'webview'
  if (/Android/i.test(ua) && /; wv\)/i.test(ua)) return 'webview'
  return null
}

export const IN_APP_NAME: Record<InAppBrowser, string> = {
  line: 'LINE',
  threads: 'Threads',
  instagram: 'Instagram',
  messenger: 'Messenger',
  facebook: 'Facebook',
  wechat: '微信',
  tiktok: 'TikTok',
  x: 'X',
  webview: 'App',
}

/** LINE 加 openExternalBrowser=1 可以直接跳到系統瀏覽器 */
export function externalBrowserUrl(href = location.href): string {
  const u = new URL(href)
  u.searchParams.set('openExternalBrowser', '1')
  return u.toString()
}

// ---------- 登出／清除 ----------

/**
 * 登出並清掉這台裝置的 Firestore 快取（共用裝置上別人的紀錄不該留著），再重新載入頁面，
 * 重新載入後會走一次全新的匿名登入。呼叫前 store 要先停掉所有監聽。
 */
export async function signOutAndWipe() {
  const { auth, db } = getFirebase()
  await signOut(auth)
  await terminate(db)
  await clearIndexedDbPersistence(db)
  location.href = import.meta.env.BASE_URL
}
