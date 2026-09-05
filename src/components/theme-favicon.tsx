"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const LIGHT = "/icon-light.png?v=8";
const DARK = "/icon-dark.png?v=8";

function applyFavicon(dark: boolean) {
  const href = dark ? DARK : LIGHT;
  let link = document.querySelector<HTMLLinkElement>('link[data-theme-favicon="true"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.setAttribute("data-theme-favicon", "true");
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== href) {
    link.href = href;
  }
}

export function ThemeFavicon() {
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
    const dark = (resolvedTheme ?? theme ?? "dark") !== "light";
    applyFavicon(dark);

    const observer = new MutationObserver(() => {
      applyFavicon(dark);
    });
    observer.observe(document.head, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [resolvedTheme, theme]);

  return null;
}
