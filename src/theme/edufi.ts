// EduFi Theme Configuration
// Official Brand Colors: Brand Blue (#002E5D), Brand Green (#30B37E)

// Brand Palette Constants
export const BrandColors = {
  brandBlue: '#002E5D',      // From mortarboard/text - Headers, titles, finance card
  brandGreen: '#30B37E',     // From coin/arrow/Fi - Action buttons, success, income
};

export const EduFiColors = {
  // Primary Brand Colors (Updated to official palette)
  primary: BrandColors.brandBlue,   // Brand Blue - Headers, titles, primary elements
  accent: BrandColors.brandGreen,   // Brand Green - Action buttons, success states
  action: BrandColors.brandGreen,   // Brand Green - CTAs, floating buttons
  background: '#FFFFFF',            // White - Main background
  text: {
    primary: '#333333',      // Dark Gray - Main text
    secondary: '#666666',    // Medium Gray - Secondary text
    light: '#999999',        // Light Gray - Disabled/placeholder text
    inverse: '#FFFFFF',      // White - Text on dark backgrounds
  },

  // Semantic Colors (using brand palette)
  success: BrandColors.brandGreen,  // Brand green for success
  warning: '#FF9800',               // Orange for warnings
  error: '#F44336',                 // Red for errors
  info: BrandColors.brandBlue,      // Brand blue for info

  // Finance-Specific Colors
  income: BrandColors.brandGreen,    // Brand green for income
  expense: '#F44336',        // Red for expenses
  budgetOn: BrandColors.brandGreen,  // On track budget
  budgetWarning: '#FF9800',  // Close to limit
  budgetOver: '#F44336',     // Over budget

  // UI Elements
  border: '#E0E0E0',         // Light borders
  divider: '#F5F5F5',        // Subtle dividers
  card: '#FFFFFF',           // Card backgrounds
  cardAlt: '#F5F5F5',        // Alt card bg (inputs in light mode)
  cardHover: '#F8F9FA',      // Card hover state
  disabled: '#BDBDBD',       // Disabled elements
  shadow: 'rgba(0, 46, 93, 0.1)', // Brand blue shadow

  // Category Colors (for expense categorization)
  categories: {
    Food: '#FF6B6B',
    Transport: '#4ECDC4',
    Data: '#95E1D3',
    Bills: '#F38181',
    Shopping: '#AA96DA',
    Health: '#FCBAD3',
    Entertainment: '#FFFFD2',
    Education: '#0B3C5D',    // Primary brand color
    Savings: '#4CAF50',      // Accent brand color
    Other: '#A8DADC',
  },
};

// Standalone exports for convenience
export const categoryColors: { [key: string]: string } = {
  Food: '#FF6B6B',
  Transport: '#4ECDC4',
  Data: '#95E1D3',
  Bills: '#F38181',
  Shopping: '#AA96DA',
  Health: '#FCBAD3',
  Entertainment: '#FFD93D',
  Education: '#0B3C5D',
  Savings: '#4CAF50',
  Salary: '#4CAF50',
  Transfer: '#4ECDC4',
  Other: '#A8DADC',
};

export const categoryEmojis: { [key: string]: string } = {
  Food: '🍔',
  Transport: '🚗',
  Data: '📱',
  Bills: '📄',
  Shopping: '🛒',
  Health: '💊',
  Entertainment: '🎬',
  Education: '📚',
  Savings: '💰',
  Salary: '💵',
  Transfer: '🔄',
  Other: '📦',
};

export const EduFiSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const EduFiFonts = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 40,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const EduFiBorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const EduFiShadows = {
  sm: {
    shadowColor: EduFiColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: EduFiColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: EduFiColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Currency formatting utility
export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default {
  colors: EduFiColors,
  spacing: EduFiSpacing,
  fonts: EduFiFonts,
  borderRadius: EduFiBorderRadius,
  shadows: EduFiShadows,
  formatNaira,
};
