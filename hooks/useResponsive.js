import { useWindowDimensions } from 'react-native';

const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isPhone = width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.largeTablet;
  const isLargeTablet = width >= BREAKPOINTS.largeTablet;
  const isLandscape = width > height;

  const numColumns = isLargeTablet ? 4 : isTablet ? 3 : 2;

  const contentMaxWidth = isPhone ? undefined : 700;

  const scale = (size) => (width / 375) * size;

  const contentPadding = isPhone ? 16 : 24;

  return {
    width,
    height,
    isPhone,
    isTablet,
    isLargeTablet,
    isLandscape,
    numColumns,
    contentMaxWidth,
    contentPadding,
    scale,
  };
}
