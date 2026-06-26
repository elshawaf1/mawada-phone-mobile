import { useMemo } from 'react';
import { useAppSettings } from '../context/AppSettingsContext';

export function useDirection() {
  const { isRTL } = useAppSettings();

  return useMemo(() => ({
    isRTL,
    row: isRTL ? 'row-reverse' : 'row',
    rowReverse: isRTL ? 'row' : 'row-reverse',
    textAlign: isRTL ? 'right' : 'left',
    textAlignReverse: isRTL ? 'left' : 'right',
    writingDirection: isRTL ? 'rtl' : 'ltr',
    alignItems: isRTL ? 'flex-end' : 'flex-start',
    alignItemsReverse: isRTL ? 'flex-start' : 'flex-end',
    leftChevron: isRTL ? 'chevron-back' : 'chevron-forward',
    rightChevron: isRTL ? 'chevron-forward' : 'chevron-back',
    flexStart: isRTL ? 'flex-end' : 'flex-start',
    flexEnd: isRTL ? 'flex-start' : 'flex-end',
    translateStart: isRTL ? { scaleX: -1 } : {},
    translateEnd: isRTL ? {} : { scaleX: -1 },
  }), [isRTL]);
}
