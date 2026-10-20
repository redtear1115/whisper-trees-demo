// 介面圖示：同一套 24px 網格、1.75 線寬、圓角端點。取代 emoji。

import type { ReactNode, SVGProps } from 'react'

function Svg({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.15em"
      height="1.15em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className="icon-svg"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconBack = () => (
  <Svg>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
)

export const IconChevron = () => (
  <Svg>
    <path d="M9 5l7 7-7 7" />
  </Svg>
)

export const IconCheck = () => (
  <Svg>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
)

export const IconCamera = () => (
  <Svg>
    <path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z" />
    <circle cx="12" cy="13" r="3.4" />
  </Svg>
)

export const IconTrash = () => (
  <Svg>
    <path d="M5 7h14M9.5 7V5h5v2M7 7l1 12h8l1-12" />
  </Svg>
)

export const IconLamp = () => (
  <Svg>
    <path d="M12 21V9M8 9h8l-1.5-4h-5zM9 21h6" />
  </Svg>
)

export const IconLayers = () => (
  <Svg>
    <path d="M12 4l8 4-8 4-8-4z" />
    <path d="M4 12l8 4 8-4M4 16l8 4 8-4" />
  </Svg>
)

export const IconSprout = () => (
  <Svg>
    <path d="M12 20v-8" />
    <path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6z" />
    <path d="M12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" />
  </Svg>
)

export const IconSpark = () => (
  <Svg>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
  </Svg>
)

export const IconHeading = () => (
  <Svg>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 6.5l2.6 7.5L12 12.6 9.4 14z" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconNorth = () => (
  <Svg>
    <path d="M12 3l4 9h-8z" fill="currentColor" stroke="none" />
    <path d="M12 21l-4-9h8z" />
  </Svg>
)

// ---- 底部導覽 ----

/** 集章冊：一枚圓章 */
export const IconStamp = () => (
  <Svg>
    <path d="M9 4h6v6l2.5 3H6.5L9 10z" />
    <path d="M5 20h14M7 16.5h10V20H7z" />
  </Svg>
)

/** 探索：羅盤 */
export const IconCompass = () => (
  <Svg>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M15.5 8.5l-2 5-5 2 2-5z" />
  </Svg>
)

/** 首頁（地圖）：地圖上的定位點 */
export const IconMapPin = () => (
  <Svg>
    <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" />
    <circle cx="12" cy="10.5" r="2.4" />
  </Svg>
)

/** 掃樹牌：QR Code 的取景框 */
export const IconScan = () => (
  <Svg>
    <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
    <rect x="8" y="8" width="3" height="3" rx="0.5" />
    <rect x="13" y="13" width="3" height="3" rx="0.5" />
    <path d="M13 8h3v2M8 16h3" />
  </Svg>
)

/** 樹洞：樹幹上的一個洞 */
export const IconHollow = () => (
  <Svg>
    <path d="M7 20V9a5 5 0 0 1 10 0v11" />
    <path d="M5 20h14" />
    <ellipse cx="12" cy="13.5" rx="2" ry="3" />
  </Svg>
)

/** 我的：小芽的頭像（圓＋肩線） */
export const IconPerson = () => (
  <Svg>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
  </Svg>
)

/** 用目前位置：定位準心 */
export const IconLocate = () => (
  <Svg>
    <circle cx="12" cy="12" r="3.2" />
    <circle cx="12" cy="12" r="7.5" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </Svg>
)

// ---- 地圖上樹旁的行動圈（和底部導覽同一套：24px 網格、1.75 線寬、currentColor） ----

/** 掃樹牌打卡：沿用底部導覽的取景框 */
export const IconActionScan = IconScan

/** 樹洞：沿用底部導覽的樹洞 */
export const IconActionWhisper = IconHollow

/** 樹的資料：一片葉子加一個 i */
export const IconActionInfo = () => (
  <Svg>
    <path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14z" />
    <path d="M5 19l7-7" />
    <path d="M15.5 14.5v3.2M15.5 12.2v.1" />
  </Svg>
)

/** 樹況回報：一片葉子加驚嘆號（不是剪刀，回報不是修剪） */
export const IconActionReport = () => (
  <Svg>
    <path d="M12 3.5C7.5 6.5 5.5 10 5.5 13.5a6.5 6.5 0 0 0 13 0c0-3.5-2-7-6.5-10z" />
    <path d="M12 9.2v4.3M12 16.4v.1" />
  </Svg>
)

/** 怎麼走：彎彎的路線，起點小圓、終點旗標 */
export const IconActionRoute = () => (
  <Svg>
    <circle cx="6" cy="18" r="2" />
    <path d="M8 18h6a3.5 3.5 0 0 0 0-7H9.5a3 3 0 0 1 0-6H16" />
    <path d="M16 3.5v6l4-1.5z" fill="currentColor" stroke="none" />
  </Svg>
)

/** 走過去（Demo）：兩個腳印 */
export const IconActionWalk = () => (
  <Svg>
    <ellipse cx="8.5" cy="14.5" rx="2.6" ry="4" transform="rotate(-12 8.5 14.5)" />
    <ellipse cx="15.5" cy="9" rx="2.6" ry="4" transform="rotate(12 15.5 9)" />
  </Svg>
)

/** 摸摸樹：張開的手掌輕放（呼吸、冥想、擁抱都從這裡進去） */
export const IconActionTouch = () => (
  <Svg>
    <path d="M7 12.5V7.5a1.5 1.5 0 0 1 3 0v4" />
    <path d="M10 11V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M13 11V6.5a1.5 1.5 0 0 1 3 0V12" />
    <path d="M16 10.5a1.5 1.5 0 0 1 3 0V14a6.5 6.5 0 0 1-6.5 6.5h-.6A6 6 0 0 1 7.6 18L4.8 14.3a1.5 1.5 0 0 1 2.2-2l1 1" />
  </Svg>
)

/** 認養（即將開放）：一顆心，中間一片小葉子 */
export const IconActionAdopt = () => (
  <Svg>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    <path d="M12 15c0-3 1.5-4.5 3.5-5-0.2 2.6-1.6 4.4-3.5 5z" />
  </Svg>
)

// ---- 裝飾圖示（取代原本沒有資訊的佔位框） ----

/** 微光、光點：四角的小星 */
export const IconGlow = () => (
  <Svg>
    <path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z" />
  </Svg>
)

/** 時空膠囊：一封信 */
export const IconCapsule = () => (
  <Svg>
    <rect x="3.5" y="6" width="17" height="12" rx="2" />
    <path d="M4 7.5l8 6 8-6" />
  </Svg>
)

/** 新手禮：禮物盒 */
export const IconGift = () => (
  <Svg>
    <rect x="4" y="10" width="16" height="10" rx="1.5" />
    <path d="M3 7h18v3H3zM12 7v13" />
    <path d="M12 7c-1.5-3.5-5.5-3-4.5 0M12 7c1.5-3.5 5.5-3 4.5 0" />
  </Svg>
)
