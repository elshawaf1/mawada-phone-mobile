import React from 'react';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  SlideInLeft,
  SlideOutLeft,
} from 'react-native-reanimated';

const easeOut = Easing.bezier(0.25, 0.1, 0.25, 1);

function getEntering(type) {
  switch (type) {
    case 'push':
      return SlideInRight.duration(450).easing(easeOut);
    case 'pop':
      return SlideInLeft.duration(400).easing(easeOut);
    case 'fade':
    default:
      return FadeIn.duration(350).easing(easeOut);
  }
}

function getExiting(type) {
  switch (type) {
    case 'push':
      return SlideOutRight.duration(450).easing(easeOut);
    case 'pop':
      return SlideOutLeft.duration(400).easing(easeOut);
    case 'fade':
    default:
      return FadeOut.duration(350).easing(easeOut);
  }
}

export default function ScreenTransition({ type = 'push', children }) {
  return (
    <Animated.View
      style={{ flex: 1 }}
      entering={getEntering(type)}
      exiting={getExiting(type)}
    >
      {children}
    </Animated.View>
  );
}
