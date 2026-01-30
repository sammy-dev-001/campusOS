/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { BrandColors } from '../theme/edufi';

const tintColorLight = '#002E5D'; // brandBlue
const tintColorDark = '#fff';

export const Colors = {
  light: {
    primary: BrandColors.brandBlue,
    secondary: '#666666',
    background: '#FFFFFF',
    text: '#333333',
    textSecondary: '#666666',
    card: '#FFFFFF',
    border: '#E0E0E0',
    error: '#F44336',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    primary: BrandColors.brandBlue,
    secondary: '#999999',
    background: '#000000',
    text: '#F4F4F5',
    textSecondary: '#A1A1AA',
    card: '#111112',
    border: '#27272A',
    error: '#EF4444',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};
