import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="flex items-center">
      <span className="text-sm mr-2">🌙</span>
      <div className="relative inline-block w-10 align-middle select-none">
        <input 
          type="checkbox" 
          id="theme-toggle" 
          name="theme-toggle" 
          checked={theme === "light"}
          onChange={toggleTheme}
          className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out"
          style={{ 
            transform: theme === "light" ? "translateX(100%)" : "translateX(0)",
            borderColor: theme === "light" ? "#FFC72C" : "gray",
            right: "auto"
          }}
        />
        <label 
          htmlFor="theme-toggle" 
          className="toggle-label block overflow-hidden h-5 rounded-full cursor-pointer"
          style={{ 
            backgroundColor: theme === "light" ? "#FFC72C" : "gray"
          }}
        >
        </label>
      </div>
      <span className="text-sm ml-2">☀️</span>
    </div>
  );
}
