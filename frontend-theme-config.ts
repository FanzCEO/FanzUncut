// FANZ Platform Theme Configuration
// This file will be used to generate platform-specific themes

export interface PlatformTheme {
  name: string
  displayName: string
  slogan: string
  domain: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    success: string
    warning: string
    error: string
    info: string
  }
  fonts: {
    heading: string
    body: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
    full: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  animations: {
    fast: string
    normal: string
    slow: string
  }
}

export const PLATFORM_THEMES: Record<string, PlatformTheme> = {
  boyfanz: {
    name: 'boyfanz',
    displayName: 'BoyFanz',
    slogan: 'Every Man\'s Playground',
    domain: 'boyfanz.com',
    colors: {
      primary: '#ff0000',        // Blood red
      secondary: '#d4af37',      // Gold
      accent: '#ffffff',         // White
      background: '#0a0a0a',     // Deep black
      surface: '#1a1a1a',       // Dark charcoal
      text: '#ffffff',          // White text
      textSecondary: '#cccccc',  // Light gray
      border: '#333333',        // Dark border
      success: '#00ff00',       // Neon green
      warning: '#ffaa00',       // Orange
      error: '#ff0000',         // Red
      info: '#00aaff'           // Blue
    },
    fonts: {
      heading: '"Bebas Neue", "Arial Black", sans-serif',
      body: '"Inter", "Helvetica", sans-serif'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem', 
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    },
    borderRadius: {
      sm: '4px',
      md: '8px', 
      lg: '12px',
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 4px rgba(255, 0, 0, 0.1)',
      md: '0 4px 8px rgba(255, 0, 0, 0.2)',
      lg: '0 8px 16px rgba(255, 0, 0, 0.3)',
      xl: '0 16px 32px rgba(255, 0, 0, 0.4)'
    },
    animations: {
      fast: '150ms ease',
      normal: '300ms ease',
      slow: '500ms ease'
    }
  },

  girlfanz: {
    name: 'girlfanz',
    displayName: 'GirlFanz', 
    slogan: 'Empowered Expression',
    domain: 'girlfanz.com',
    colors: {
      primary: '#ff69b4',        // Hot pink
      secondary: '#d4af37',      // Gold
      accent: '#ffffff',         // White
      background: '#fdf7f0',     // Warm cream
      surface: '#ffffff',       // Pure white
      text: '#2d2d2d',          // Dark gray
      textSecondary: '#666666',  // Medium gray
      border: '#e5e5e5',        // Light border
      success: '#00c851',       // Green
      warning: '#ffbb33',       // Amber
      error: '#ff4444',         // Red
      info: '#33b5e5'           // Light blue
    },
    fonts: {
      heading: '"Playfair Display", "Georgia", serif',
      body: '"Inter", "Helvetica", sans-serif'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem', 
      lg: '1.5rem',
      xl: '2rem'
    },
    borderRadius: {
      sm: '6px',
      md: '12px',
      lg: '18px', 
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 8px rgba(255, 105, 180, 0.1)',
      md: '0 4px 16px rgba(255, 105, 180, 0.15)',
      lg: '0 8px 24px rgba(255, 105, 180, 0.2)',
      xl: '0 16px 40px rgba(255, 105, 180, 0.25)'
    },
    animations: {
      fast: '200ms ease-out',
      normal: '350ms ease-out', 
      slow: '600ms ease-out'
    }
  },

  pupfanz: {
    name: 'pupfanz',
    displayName: 'PupFanz',
    slogan: 'Community Playground', 
    domain: 'pupfanz.com',
    colors: {
      primary: '#ff8c00',        // Dark orange
      secondary: '#4169e1',      // Royal blue
      accent: '#ffffff',         // White
      background: '#fff8f0',     // Light cream
      surface: '#ffffff',       // White
      text: '#333333',          // Dark gray
      textSecondary: '#666666',  // Medium gray
      border: '#dddddd',        // Light border
      success: '#32d74b',       // Green
      warning: '#ff9500',       // Orange
      error: '#ff3b30',         // Red
      info: '#007aff'           // Blue
    },
    fonts: {
      heading: '"Nunito", "Helvetica", sans-serif',
      body: '"Inter", "Helvetica", sans-serif'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem', 
      xl: '2rem'
    },
    borderRadius: {
      sm: '8px',
      md: '16px',
      lg: '24px',
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 6px rgba(255, 140, 0, 0.1)',
      md: '0 4px 12px rgba(255, 140, 0, 0.15)',
      lg: '0 8px 20px rgba(255, 140, 0, 0.2)', 
      xl: '0 16px 32px rgba(255, 140, 0, 0.25)'
    },
    animations: {
      fast: '180ms ease-in-out',
      normal: '320ms ease-in-out',
      slow: '550ms ease-in-out'
    }
  },

  transfanz: {
    name: 'transfanz',
    displayName: 'TransFanz',
    slogan: 'Authentic Stories',
    domain: 'transfanz.com', 
    colors: {
      primary: '#00bcd4',        // Cyan
      secondary: '#ffffff',      // White
      accent: '#ff69b4',         // Pink accent
      background: '#f8f9fa',     // Light gray
      surface: '#ffffff',       // White
      text: '#212529',          // Dark text
      textSecondary: '#6c757d',  // Gray text
      border: '#dee2e6',        // Light border
      success: '#28a745',       // Green
      warning: '#ffc107',       // Yellow
      error: '#dc3545',         // Red
      info: '#17a2b8'           // Teal
    },
    fonts: {
      heading: '"Roboto", "Helvetica", sans-serif',
      body: '"Inter", "Helvetica", sans-serif'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 4px rgba(0, 188, 212, 0.1)', 
      md: '0 4px 8px rgba(0, 188, 212, 0.15)',
      lg: '0 8px 16px rgba(0, 188, 212, 0.2)',
      xl: '0 16px 32px rgba(0, 188, 212, 0.25)'
    },
    animations: {
      fast: '150ms ease',
      normal: '300ms ease',
      slow: '500ms ease'
    }
  },

  taboofanz: {
    name: 'taboofanz',
    displayName: 'TabooFanz',
    slogan: 'Beyond Boundaries',
    domain: 'taboofanz.com',
    colors: {
      primary: '#8a2be2',        // Blue violet
      secondary: '#ffd700',      // Gold
      accent: '#ffffff',         // White
      background: '#1a0d1a',     // Dark purple
      surface: '#2d1b2d',       // Medium purple
      text: '#e6e6e6',          // Light gray
      textSecondary: '#cccccc',  // Medium gray
      border: '#4a2d4a',        // Purple border
      success: '#00ff7f',       // Spring green
      warning: '#ffa500',       // Orange
      error: '#ff1493',         // Deep pink
      info: '#9370db'           // Medium purple
    },
    fonts: {
      heading: '"Orbitron", "Arial", sans-serif',
      body: '"Inter", "Helvetica", sans-serif'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    },
    borderRadius: {
      sm: '6px',
      md: '10px',
      lg: '16px',
      full: '9999px'
    },
    shadows: {
      sm: '0 2px 6px rgba(138, 43, 226, 0.2)',
      md: '0 4px 12px rgba(138, 43, 226, 0.3)', 
      lg: '0 8px 20px rgba(138, 43, 226, 0.4)',
      xl: '0 16px 36px rgba(138, 43, 226, 0.5)'
    },
    animations: {
      fast: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
      normal: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
      slow: '700ms cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }
}

// Export individual themes for easier access
export const BoyFanzTheme = PLATFORM_THEMES.boyfanz
export const GirlFanzTheme = PLATFORM_THEMES.girlfanz  
export const PupFanzTheme = PLATFORM_THEMES.pupfanz
export const TransFanzTheme = PLATFORM_THEMES.transfanz
export const TabooFanzTheme = PLATFORM_THEMES.taboofanz

// Helper function to get theme by platform name
export const getThemeByPlatform = (platform: string): PlatformTheme => {
  const theme = PLATFORM_THEMES[platform.toLowerCase()]
  if (!theme) {
    throw new Error(`Theme not found for platform: ${platform}`)
  }
  return theme
}

// Generate CSS custom properties for a theme
export const generateThemeCSS = (theme: PlatformTheme): string => {
  return `
:root {
  /* Colors */
  --color-primary: ${theme.colors.primary};
  --color-secondary: ${theme.colors.secondary};
  --color-accent: ${theme.colors.accent};
  --color-background: ${theme.colors.background};
  --color-surface: ${theme.colors.surface};
  --color-text: ${theme.colors.text};
  --color-text-secondary: ${theme.colors.textSecondary};
  --color-border: ${theme.colors.border};
  --color-success: ${theme.colors.success};
  --color-warning: ${theme.colors.warning};
  --color-error: ${theme.colors.error};
  --color-info: ${theme.colors.info};
  
  /* Typography */
  --font-heading: ${theme.fonts.heading};
  --font-body: ${theme.fonts.body};
  
  /* Spacing */
  --spacing-xs: ${theme.spacing.xs};
  --spacing-sm: ${theme.spacing.sm};
  --spacing-md: ${theme.spacing.md};
  --spacing-lg: ${theme.spacing.lg};
  --spacing-xl: ${theme.spacing.xl};
  
  /* Border Radius */
  --radius-sm: ${theme.borderRadius.sm};
  --radius-md: ${theme.borderRadius.md};
  --radius-lg: ${theme.borderRadius.lg};
  --radius-full: ${theme.borderRadius.full};
  
  /* Shadows */
  --shadow-sm: ${theme.shadows.sm};
  --shadow-md: ${theme.shadows.md};
  --shadow-lg: ${theme.shadows.lg};
  --shadow-xl: ${theme.shadows.xl};
  
  /* Animations */
  --animation-fast: ${theme.animations.fast};
  --animation-normal: ${theme.animations.normal};
  --animation-slow: ${theme.animations.slow};
}

/* Global styles */
body {
  background-color: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  color: var(--color-text);
}

/* Platform-specific utility classes */
.bg-primary { background-color: var(--color-primary); }
.bg-secondary { background-color: var(--color-secondary); }
.bg-accent { background-color: var(--color-accent); }
.bg-surface { background-color: var(--color-surface); }

.text-primary { color: var(--color-primary); }
.text-secondary { color: var(--color-secondary); }
.text-accent { color: var(--color-accent); }

.border-primary { border-color: var(--color-primary); }
.border-secondary { border-color: var(--color-secondary); }

.shadow-primary { box-shadow: var(--shadow-md); }
.rounded-primary { border-radius: var(--radius-md); }

/* Platform-specific button styles */
.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-accent);
  border: none;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-weight: 600;
  transition: all var(--animation-fast);
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: var(--color-background);
  border: none;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-weight: 600;
  transition: all var(--animation-fast);
  cursor: pointer;
}

.btn-secondary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
`
}

// Tailwind CSS configuration for each platform
export const generateTailwindConfig = (theme: PlatformTheme) => {
  return {
    theme: {
      extend: {
        colors: {
          primary: {
            50: theme.colors.primary + '0D',
            100: theme.colors.primary + '1A', 
            200: theme.colors.primary + '33',
            300: theme.colors.primary + '4D',
            400: theme.colors.primary + '66',
            500: theme.colors.primary,
            600: theme.colors.primary + 'CC',
            700: theme.colors.primary + 'B3',
            800: theme.colors.primary + '99',
            900: theme.colors.primary + '80',
          },
          secondary: {
            DEFAULT: theme.colors.secondary,
            50: theme.colors.secondary + '0D',
            500: theme.colors.secondary,
            900: theme.colors.secondary + '80',
          },
          background: theme.colors.background,
          surface: theme.colors.surface,
          accent: theme.colors.accent,
        },
        fontFamily: {
          heading: theme.fonts.heading.split(','),
          body: theme.fonts.body.split(','),
        },
        spacing: {
          xs: theme.spacing.xs,
          sm: theme.spacing.sm, 
          md: theme.spacing.md,
          lg: theme.spacing.lg,
          xl: theme.spacing.xl,
        },
        borderRadius: {
          sm: theme.borderRadius.sm,
          md: theme.borderRadius.md,
          lg: theme.borderRadius.lg,
        },
        boxShadow: {
          sm: theme.shadows.sm,
          md: theme.shadows.md,
          lg: theme.shadows.lg,
          xl: theme.shadows.xl,
        },
        transitionDuration: {
          fast: theme.animations.fast.split(' ')[0],
          normal: theme.animations.normal.split(' ')[0],
          slow: theme.animations.slow.split(' ')[0],
        }
      }
    }
  }
}