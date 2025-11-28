import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function useTheme() {
  const { data: activeTheme } = useQuery({
    queryKey: ['/api/themes/active'],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });

  useEffect(() => {
    if (activeTheme) {
      try {
        applyTheme(activeTheme);
      } catch (error) {
        console.warn('Failed to apply theme:', error);
        // Continue anyway - don't block app loading
      }
    }
  }, [activeTheme]);

  return { activeTheme };
}

function applyTheme(theme: any) {
  const root = document.documentElement;
  
  // Apply colors
  if (theme.colors) {
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;
      root.style.setProperty(cssVar, value as string);
    });
  }

  // Apply typography
  if (theme.typography) {
    root.style.setProperty('--font-display', `"${theme.typography.fontDisplay}", sans-serif`);
    root.style.setProperty('--font-heading', `"${theme.typography.fontHeading}", sans-serif`);
    root.style.setProperty('--font-body', `"${theme.typography.fontBody}", sans-serif`);
  }

  // Apply effects
  if (theme.effects) {
    // Update neon intensity
    if (theme.effects.neonIntensity !== undefined) {
      const intensity = theme.effects.neonIntensity;
      root.style.setProperty('--neon-intensity', intensity.toString());
    }

    // Toggle effects based on settings
    root.classList.toggle('glow-disabled', !theme.effects.glowEnabled);
    root.classList.toggle('smoky-disabled', !theme.effects.smokyBackground);
    root.classList.toggle('flicker-disabled', !theme.effects.flickerEnabled);
  }
}