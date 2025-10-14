// Theme singleton that can be used anywhere in the app

// Default theme values
const defaultLightTheme = {
  background: '#ffffff',
  primary: '#000000',
  text: '#000000',
  textSecondary: '#666666',
  secondary: '#666666',
  card: '#ffffff',
  border: '#e0e0e0',
  error: '#ff3b30',
  isDark: false,
};

const defaultDarkTheme = {
  background: '#121212',
  primary: '#ffffff',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  secondary: '#666666',
  card: '#1e1e1e',
  border: '#333333',
  error: '#cf6679',
  isDark: true,
};

class ThemeManager {
  private static instance: ThemeManager;
  private isDarkMode: boolean = true;
  private subscribers: Array<() => void> = [];

  private constructor() {}

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  public getTheme() {
    return this.isDarkMode ? defaultDarkTheme : defaultLightTheme;
  }

  public toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.notifySubscribers();
  }

  public setDarkMode(isDark: boolean) {
    this.isDarkMode = isDark;
    this.notifySubscribers();
  }

  public subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback());
  }
}

export const themeManager = ThemeManager.getInstance();

export function useTheme() {
  const [theme, setTheme] = React.useState(themeManager.getTheme());

  React.useEffect(() => {
    return themeManager.subscribe(() => {
      setTheme(themeManager.getTheme());
    });
  }, []);

  return {
    theme,
    isDark: themeManager.isDarkMode,
    toggleTheme: () => themeManager.toggleTheme(),
  };
}

// Export default theme for direct usage
export const theme = themeManager.getTheme();
