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

export const IconMore = () => (
  <Svg>
    <circle cx="5.5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="18.5" cy="12" r="1.2" />
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
