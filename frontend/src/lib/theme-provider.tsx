import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

type ThemeProviderContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeProviderContext = createContext<ThemeProviderContextType | undefined>(undefined);

function safeLocalStorage(action: 'get' | 'set', key: string, value?: string): string | null {
  try {
    if (action === 'get') {
      return localStorage.getItem(key);
    } else if (action === 'set' && value !== undefined) {
      localStorage.setItem(key, value);
    }
  } catch {
    // localStorage blocked or unavailable - fail silently
  }
  return null;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  
  const stored = safeLocalStorage('get', "ruby-ai-theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  
  // Default to dark theme
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    safeLocalStorage('set', "ruby-ai-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
