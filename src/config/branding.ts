const LOGO_BASE_URL = 'https://www.dailyfriend.co.uk/brand/dailyfriend/SVG'
const FAVICON_URL = `${LOGO_BASE_URL}/dailyfriend-favicon.svg`

export const DAILYFRIEND_LOGOS = {
  horizontalGradient: `${LOGO_BASE_URL}/dailyfriend-logo-horizontal-gradient-transparent.svg`,
  iconGradient: `${LOGO_BASE_URL}/dailyfriend-icon-gradient-transparent.svg`,
  iconBlack: `${LOGO_BASE_URL}/dailyfriend-icon-black-transparent.svg`,
  iconWhite: `${LOGO_BASE_URL}/dailyfriend-icon-white-transparent.svg`,
  favicon: FAVICON_URL,
} as const
