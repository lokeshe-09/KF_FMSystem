/**
 * Responsive Design Utilities
 * Provides consistent breakpoint definitions and utility functions for responsive design
 */

// Breakpoint definitions (matching Tailwind CSS defaults)
export const BREAKPOINTS = {
  xs: '475px',   // Small mobile devices
  sm: '640px',   // Large mobile devices
  md: '768px',   // Tablets
  lg: '1024px',  // Small laptops
  xl: '1280px',  // Large laptops
  '2xl': '1536px' // Large screens
};

// Common responsive class patterns
export const RESPONSIVE_CLASSES = {
  // Container padding
  containerPadding: 'px-3 sm:px-4 md:px-6 lg:px-8',

  // Card padding
  cardPadding: 'p-4 sm:p-5 md:p-6',

  // Touch target (minimum 44px for accessibility)
  touchTarget: 'min-h-[44px] min-w-[44px]',

  // Button sizes
  buttonSizes: {
    small: 'h-8 w-8 sm:h-10 sm:w-10',
    medium: 'h-10 w-10 sm:h-12 sm:w-12',
    large: 'h-12 w-12 sm:h-14 sm:w-14'
  },

  // Text sizing
  textSizes: {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl md:text-2xl',
    xl: 'text-xl sm:text-2xl md:text-3xl',
    '2xl': 'text-2xl sm:text-3xl md:text-4xl'
  },

  // Grid columns for cards
  gridCols: {
    auto: 'grid-cols-1 xs:grid-cols-2 lg:grid-cols-4',
    two: 'grid-cols-1 sm:grid-cols-2',
    three: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    four: 'grid-cols-1 xs:grid-cols-2 lg:grid-cols-4',
    six: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
  },

  // Spacing
  spacing: {
    xs: 'space-y-2 sm:space-y-3',
    sm: 'space-y-3 sm:space-y-4',
    md: 'space-y-4 sm:space-y-6',
    lg: 'space-y-6 sm:space-y-8',
    xl: 'space-y-8 sm:space-y-12'
  },

  // Gaps
  gaps: {
    xs: 'gap-2 sm:gap-3',
    sm: 'gap-3 sm:gap-4',
    md: 'gap-4 sm:gap-5 md:gap-6',
    lg: 'gap-6 sm:gap-8'
  }
};

// Utility functions
export const useResponsive = () => {
  // Check if current screen size matches a breakpoint
  const isBreakpoint = (breakpoint) => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(min-width: ${BREAKPOINTS[breakpoint]})`).matches;
  };

  // Get current breakpoint
  const getCurrentBreakpoint = () => {
    if (typeof window === 'undefined') return 'xs';

    const breakpoints = Object.keys(BREAKPOINTS).reverse();
    for (const bp of breakpoints) {
      if (window.matchMedia(`(min-width: ${BREAKPOINTS[bp]})`).matches) {
        return bp;
      }
    }
    return 'xs';
  };

  // Check if mobile device
  const isMobile = () => {
    return !isBreakpoint('md');
  };

  // Check if tablet
  const isTablet = () => {
    return isBreakpoint('md') && !isBreakpoint('lg');
  };

  // Check if desktop
  const isDesktop = () => {
    return isBreakpoint('lg');
  };

  return {
    isBreakpoint,
    getCurrentBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
    breakpoints: BREAKPOINTS
  };
};

// Common responsive patterns for specific components
export const COMPONENT_PATTERNS = {
  // Modal/Dialog responsive patterns
  modal: {
    container: 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4',
    content: 'w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl',
    padding: 'p-4 sm:p-5 md:p-6'
  },

  // Form responsive patterns
  form: {
    container: 'space-y-4 sm:space-y-6',
    input: 'w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base',
    button: 'w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base min-h-[44px]',
    grid: 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'
  },

  // Table responsive patterns
  table: {
    container: 'overflow-x-auto',
    table: 'min-w-full divide-y divide-gray-200',
    cell: 'px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm',
    header: 'px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium'
  },

  // Navigation responsive patterns
  navigation: {
    item: 'flex items-center px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base min-h-[44px]',
    icon: 'h-5 w-5 sm:h-6 sm:w-6 mr-3 sm:mr-4 flex-shrink-0'
  }
};

// Media query helpers
export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.md})`,
  tablet: `(min-width: ${BREAKPOINTS.md}) and (max-width: ${BREAKPOINTS.lg})`,
  desktop: `(min-width: ${BREAKPOINTS.lg})`,

  // Specific breakpoints
  xs: `(min-width: ${BREAKPOINTS.xs})`,
  sm: `(min-width: ${BREAKPOINTS.sm})`,
  md: `(min-width: ${BREAKPOINTS.md})`,
  lg: `(min-width: ${BREAKPOINTS.lg})`,
  xl: `(min-width: ${BREAKPOINTS.xl})`,
  '2xl': `(min-width: ${BREAKPOINTS['2xl']})`
};

// Export default object with all utilities
export default {
  BREAKPOINTS,
  RESPONSIVE_CLASSES,
  COMPONENT_PATTERNS,
  MEDIA_QUERIES,
  useResponsive
};