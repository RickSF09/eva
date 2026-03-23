const LOGO_BASE_URL = 'https://www.evacares.co.uk/brand/logos/SVG'
const FAVICON_URL = 'https://www.evacares.co.uk/brand/logos/SVG/eva-cares-favicon.svg?v=1'

export const EVA_CARES_LOGOS = {
  horizontalGradient: `${LOGO_BASE_URL}/eva-cares-logo-horizontal-gradient-no-bg.svg`,
  iconGradient: `${LOGO_BASE_URL}/eva-cares-icon-gradient.svg`,
  iconBlack: `${LOGO_BASE_URL}/eva-cares-icon-black.svg`,
  iconWhite: `${LOGO_BASE_URL}/eva-cares-icon-white.svg`,
  favicon: FAVICON_URL,
} as const
