"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

const ORDER: Theme[] = ["system", "light", "dark"];

/** Cycles system -> light -> dark. Stored in a cookie so the server renders the right theme. */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const { dict } = useI18n();
  const [theme, setTheme] = useState<Theme>(initial);
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]!;
  const labels: Record<Theme, string> = { system: dict.common.themeSystem, light: dict.common.themeLight, dark: dict.common.themeDark };
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        setTheme(next);
      }}
      className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-2"
      aria-label={`${dict.common.theme}: ${labels[theme]}`}
      title={labels[theme]}
    >
      <Icon aria-hidden className="size-[1.15rem]" />
    </button>
  );
}
