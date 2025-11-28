#!/bin/bash
# FANZ UI Component Generator
# Generates platform-specific UI components and themes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_ROOT="/Users/joshuastone/Downloads/BoyFanz-3"
FRONTEND_ROOT="$PROJECT_ROOT/frontend"
UI_PACKAGE="$FRONTEND_ROOT/packages/ui"

echo -e "${CYAN}🎨 FANZ UI Components Generator${NC}"
echo -e "${CYAN}==============================${NC}"
echo ""

print_status() {
    echo -e "${BLUE}[GEN]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✅ DONE]${NC} $1"
}

print_error() {
    echo -e "${RED}[❌ ERROR]${NC} $1"
}

# Create base UI components
create_button_component() {
    print_status "Creating Button component..."
    
    mkdir -p "$UI_PACKAGE/src/components/ui"
    
    cat > "$UI_PACKAGE/src/components/ui/button.tsx" << 'EOF'
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Platform-specific variants
        boyfanz: "bg-[#ff0000] text-white hover:bg-[#ff0000]/90 shadow-md hover:shadow-lg font-bold",
        girlfanz: "bg-[#ff69b4] text-white hover:bg-[#ff69b4]/90 shadow-md hover:shadow-lg rounded-xl",
        pupfanz: "bg-[#ff8c00] text-white hover:bg-[#ff8c00]/90 shadow-md hover:shadow-lg rounded-2xl",
        transfanz: "bg-[#00bcd4] text-white hover:bg-[#00bcd4]/90 shadow-md hover:shadow-lg",
        taboofanz: "bg-[#8a2be2] text-white hover:bg-[#8a2be2]/90 shadow-lg hover:shadow-xl"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
EOF
    
    print_success "Button component created"
}

# Create Card component
create_card_component() {
    print_status "Creating Card component..."
    
    cat > "$UI_PACKAGE/src/components/ui/card.tsx" << 'EOF'
import * as React from "react"
import { cn } from "../../lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    platform?: 'boyfanz' | 'girlfanz' | 'pupfanz' | 'transfanz' | 'taboofanz'
  }
>(({ className, platform, ...props }, ref) => {
  const platformStyles = {
    boyfanz: "bg-[#1a1a1a] border-[#333333] shadow-lg hover:shadow-[0_8px_16px_rgba(255,0,0,0.3)]",
    girlfanz: "bg-white border-[#e5e5e5] shadow-lg hover:shadow-[0_8px_24px_rgba(255,105,180,0.2)] rounded-2xl",
    pupfanz: "bg-white border-[#dddddd] shadow-lg hover:shadow-[0_8px_20px_rgba(255,140,0,0.2)] rounded-3xl",
    transfanz: "bg-white border-[#dee2e6] shadow-lg hover:shadow-[0_8px_16px_rgba(0,188,212,0.2)]",
    taboofanz: "bg-[#2d1b2d] border-[#4a2d4a] shadow-xl hover:shadow-[0_8px_20px_rgba(138,43,226,0.4)] rounded-lg"
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow",
        platform && platformStyles[platform],
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    platform?: 'boyfanz' | 'girlfanz' | 'pupfanz' | 'transfanz' | 'taboofanz'
  }
>(({ className, platform, ...props }, ref) => {
  const platformFonts = {
    boyfanz: "font-['Bebas_Neue'] text-white",
    girlfanz: "font-['Playfair_Display'] text-[#2d2d2d]",
    pupfanz: "font-['Nunito'] text-[#333333]",
    transfanz: "font-['Roboto'] text-[#212529]",
    taboofanz: "font-['Orbitron'] text-[#e6e6e6]"
  }
  
  return (
    <h3
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        platform && platformFonts[platform],
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    platform?: 'boyfanz' | 'girlfanz' | 'pupfanz' | 'transfanz' | 'taboofanz'
  }
>(({ className, platform, ...props }, ref) => {
  const platformColors = {
    boyfanz: "text-[#cccccc]",
    girlfanz: "text-[#666666]", 
    pupfanz: "text-[#666666]",
    transfanz: "text-[#6c757d]",
    taboofanz: "text-[#cccccc]"
  }
  
  return (
    <p
      ref={ref}
      className={cn(
        "text-sm text-muted-foreground",
        platform && platformColors[platform],
        className
      )}
      {...props}
    />
  )
})
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
EOF
    
    print_success "Card component created"
}

# Create Input component
create_input_component() {
    print_status "Creating Input component..."
    
    cat > "$UI_PACKAGE/src/components/ui/input.tsx" << 'EOF'
import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  platform?: 'boyfanz' | 'girlfanz' | 'pupfanz' | 'transfanz' | 'taboofanz'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, platform, ...props }, ref) => {
    const platformStyles = {
      boyfanz: "bg-[#1a1a1a] border-[#333333] text-white placeholder:text-[#888888] focus:border-[#ff0000] focus:ring-[#ff0000]",
      girlfanz: "bg-white border-[#e5e5e5] text-[#2d2d2d] placeholder:text-[#999999] focus:border-[#ff69b4] focus:ring-[#ff69b4] rounded-xl",
      pupfanz: "bg-white border-[#dddddd] text-[#333333] placeholder:text-[#999999] focus:border-[#ff8c00] focus:ring-[#ff8c00] rounded-2xl",
      transfanz: "bg-white border-[#dee2e6] text-[#212529] placeholder:text-[#6c757d] focus:border-[#00bcd4] focus:ring-[#00bcd4]",
      taboofanz: "bg-[#2d1b2d] border-[#4a2d4a] text-[#e6e6e6] placeholder:text-[#999999] focus:border-[#8a2be2] focus:ring-[#8a2be2] rounded-lg"
    }
    
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          platform && platformStyles[platform],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
EOF
    
    print_success "Input component created"
}

# Create Avatar component
create_avatar_component() {
    print_status "Creating Avatar component..."
    
    cat > "$UI_PACKAGE/src/components/ui/avatar.tsx" << 'EOF'
import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "../../lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    platform?: 'boyfanz' | 'girlfanz' | 'pupfanz' | 'transfanz' | 'taboofanz'
  }
>(({ className, platform, ...props }, ref) => {
  const platformStyles = {
    boyfanz: "ring-2 ring-[#ff0000]",
    girlfanz: "ring-2 ring-[#ff69b4]", 
    pupfanz: "ring-2 ring-[#ff8c00]",
    transfanz: "ring-2 ring-[#00bcd4]",
    taboofanz: "ring-2 ring-[#8a2be2]"
  }
  
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        platform && platformStyles[platform],
        className
      )}
      {...props}
    />
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    platform?: 'boyfanz' | 'girlfanz' | 'pupfanz' | 'transfanz' | 'taboofanz'
  }
>(({ className, platform, ...props }, ref) => {
  const platformStyles = {
    boyfanz: "bg-[#1a1a1a] text-[#ff0000]",
    girlfanz: "bg-[#fdf7f0] text-[#ff69b4]",
    pupfanz: "bg-[#fff8f0] text-[#ff8c00]", 
    transfanz: "bg-[#f8f9fa] text-[#00bcd4]",
    taboofanz: "bg-[#2d1b2d] text-[#8a2be2]"
  }
  
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        platform && platformStyles[platform],
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
EOF
    
    print_success "Avatar component created"
}

# Create Badge component
create_badge_component() {
    print_status "Creating Badge component..."
    
    cat > "$UI_PACKAGE/src/components/ui/badge.tsx" << 'EOF'
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Platform-specific variants
        boyfanz: "border-transparent bg-[#ff0000] text-white hover:bg-[#ff0000]/80 shadow-sm",
        girlfanz: "border-transparent bg-[#ff69b4] text-white hover:bg-[#ff69b4]/80 shadow-sm rounded-full",
        pupfanz: "border-transparent bg-[#ff8c00] text-white hover:bg-[#ff8c00]/80 shadow-sm rounded-full",
        transfanz: "border-transparent bg-[#00bcd4] text-white hover:bg-[#00bcd4]/80 shadow-sm",
        taboofanz: "border-transparent bg-[#8a2be2] text-white hover:bg-[#8a2be2]/80 shadow-sm"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
EOF
    
    print_success "Badge component created"
}

# Create platform-specific layout components
create_layout_components() {
    print_status "Creating layout components..."
    
    mkdir -p "$UI_PACKAGE/src/components/layout"
    
    # Platform Header
    cat > "$UI_PACKAGE/src/components/layout/header.tsx" << 'EOF'
import * as React from "react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar"

export interface HeaderProps {
  platform: 'boyfanz' | 'girlfanz' | 'pupfanz' | 'transfanz' | 'taboofanz'
  user?: {
    name: string
    avatar?: string
  }
  className?: string
}

const platformConfig = {
  boyfanz: {
    logo: "BoyFanz",
    slogan: "Every Man's Playground",
    bgClass: "bg-[#0a0a0a] border-b-[#333333]",
    textClass: "text-white",
    logoClass: "text-[#ff0000] font-['Bebas_Neue'] text-2xl font-bold"
  },
  girlfanz: {
    logo: "GirlFanz", 
    slogan: "Empowered Expression",
    bgClass: "bg-white border-b-[#e5e5e5]",
    textClass: "text-[#2d2d2d]",
    logoClass: "text-[#ff69b4] font-['Playfair_Display'] text-2xl font-semibold"
  },
  pupfanz: {
    logo: "PupFanz",
    slogan: "Community Playground", 
    bgClass: "bg-white border-b-[#dddddd]",
    textClass: "text-[#333333]",
    logoClass: "text-[#ff8c00] font-['Nunito'] text-2xl font-bold"
  },
  transfanz: {
    logo: "TransFanz",
    slogan: "Authentic Stories",
    bgClass: "bg-white border-b-[#dee2e6]", 
    textClass: "text-[#212529]",
    logoClass: "text-[#00bcd4] font-['Roboto'] text-2xl font-medium"
  },
  taboofanz: {
    logo: "TabooFanz",
    slogan: "Beyond Boundaries",
    bgClass: "bg-[#1a0d1a] border-b-[#4a2d4a]",
    textClass: "text-[#e6e6e6]", 
    logoClass: "text-[#8a2be2] font-['Orbitron'] text-2xl font-bold"
  }
}

export function Header({ platform, user, className }: HeaderProps) {
  const config = platformConfig[platform]
  
  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60",
      config.bgClass,
      className
    )}>
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className={cn("font-bold", config.logoClass)}>
            {config.logo}
          </div>
          <div className={cn("hidden sm:block text-sm", config.textClass)}>
            {config.slogan}
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <a href="/explore" className={cn("text-sm font-medium hover:opacity-80", config.textClass)}>
            Explore
          </a>
          <a href="/creators" className={cn("text-sm font-medium hover:opacity-80", config.textClass)}>
            Creators
          </a>
          <a href="/live" className={cn("text-sm font-medium hover:opacity-80", config.textClass)}>
            Live
          </a>
        </nav>
        
        {/* User Section */}
        <div className="flex items-center space-x-2">
          {user ? (
            <div className="flex items-center space-x-2">
              <Avatar platform={platform} className="h-8 w-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback platform={platform}>
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className={cn("hidden sm:block text-sm", config.textClass)}>
                {user.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant={platform} size="sm">
                Sign In
              </Button>
              <Button variant="outline" size="sm">
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
EOF

    print_success "Layout components created"
}

# Update component index
update_component_index() {
    print_status "Updating component index..."
    
    cat > "$UI_PACKAGE/src/components/ui/index.ts" << 'EOF'
export * from "./avatar"
export * from "./badge" 
export * from "./button"
export * from "./card"
export * from "./input"
EOF

    cat > "$UI_PACKAGE/src/components/index.ts" << 'EOF'
export * from "./ui"
export * from "./layout"
EOF

    print_success "Component index updated"
}

# Create platform theme hook
create_platform_hook() {
    print_status "Creating platform theme hook..."
    
    mkdir -p "$UI_PACKAGE/src/hooks"
    
    cat > "$UI_PACKAGE/src/hooks/use-platform-theme.ts" << 'EOF'
import { useMemo } from 'react'

export type Platform = 'boyfanz' | 'girlfanz' | 'pupfanz' | 'transfanz' | 'taboofanz'

export interface PlatformTheme {
  name: Platform
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
  }
  fonts: {
    heading: string
    body: string
  }
}

const PLATFORM_THEMES: Record<Platform, PlatformTheme> = {
  boyfanz: {
    name: 'boyfanz',
    displayName: 'BoyFanz',
    slogan: 'Every Man\'s Playground',
    domain: 'boyfanz.com',
    colors: {
      primary: '#ff0000',
      secondary: '#d4af37',
      accent: '#ffffff',
      background: '#0a0a0a',
      surface: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#cccccc',
      border: '#333333'
    },
    fonts: {
      heading: 'Bebas Neue, Arial Black, sans-serif',
      body: 'Inter, Helvetica, sans-serif'
    }
  },
  girlfanz: {
    name: 'girlfanz',
    displayName: 'GirlFanz',
    slogan: 'Empowered Expression',
    domain: 'girlfanz.com',
    colors: {
      primary: '#ff69b4',
      secondary: '#d4af37', 
      accent: '#ffffff',
      background: '#fdf7f0',
      surface: '#ffffff',
      text: '#2d2d2d',
      textSecondary: '#666666',
      border: '#e5e5e5'
    },
    fonts: {
      heading: 'Playfair Display, Georgia, serif',
      body: 'Inter, Helvetica, sans-serif'
    }
  },
  pupfanz: {
    name: 'pupfanz',
    displayName: 'PupFanz',
    slogan: 'Community Playground',
    domain: 'pupfanz.com',
    colors: {
      primary: '#ff8c00',
      secondary: '#4169e1',
      accent: '#ffffff',
      background: '#fff8f0',
      surface: '#ffffff',
      text: '#333333',
      textSecondary: '#666666',
      border: '#dddddd'
    },
    fonts: {
      heading: 'Nunito, Helvetica, sans-serif',
      body: 'Inter, Helvetica, sans-serif'
    }
  },
  transfanz: {
    name: 'transfanz',
    displayName: 'TransFanz',
    slogan: 'Authentic Stories',
    domain: 'transfanz.com',
    colors: {
      primary: '#00bcd4',
      secondary: '#ffffff',
      accent: '#ff69b4',
      background: '#f8f9fa',
      surface: '#ffffff',
      text: '#212529',
      textSecondary: '#6c757d',
      border: '#dee2e6'
    },
    fonts: {
      heading: 'Roboto, Helvetica, sans-serif',
      body: 'Inter, Helvetica, sans-serif'
    }
  },
  taboofanz: {
    name: 'taboofanz',
    displayName: 'TabooFanz', 
    slogan: 'Beyond Boundaries',
    domain: 'taboofanz.com',
    colors: {
      primary: '#8a2be2',
      secondary: '#ffd700',
      accent: '#ffffff',
      background: '#1a0d1a',
      surface: '#2d1b2d',
      text: '#e6e6e6',
      textSecondary: '#cccccc',
      border: '#4a2d4a'
    },
    fonts: {
      heading: 'Orbitron, Arial, sans-serif',
      body: 'Inter, Helvetica, sans-serif'
    }
  }
}

export function usePlatformTheme(platform: Platform) {
  const theme = useMemo(() => PLATFORM_THEMES[platform], [platform])
  
  return {
    theme,
    ...theme
  }
}

export function useCurrentPlatform(): Platform {
  // In a real app, this would detect the current platform from the URL or environment
  // For now, we'll return a default
  return (process.env.NEXT_PUBLIC_PLATFORM as Platform) || 'boyfanz'
}
EOF

    cat > "$UI_PACKAGE/src/hooks/index.ts" << 'EOF'
export * from "./use-platform-theme"
EOF

    print_success "Platform theme hook created"
}

# Main execution
main() {
    echo -e "${PURPLE}Generating FANZ UI Components...${NC}"
    echo ""
    
    if [ ! -d "$UI_PACKAGE" ]; then
        print_error "UI package directory not found. Please run setup-frontend.sh first."
        exit 1
    fi
    
    create_button_component
    create_card_component
    create_input_component
    create_avatar_component
    create_badge_component
    create_layout_components
    create_platform_hook
    update_component_index
    
    echo ""
    print_success "🎉 FANZ UI Components Generated Successfully!"
    echo ""
    echo -e "${CYAN}📦 Created components:${NC}"
    echo "- Button (with platform variants)"
    echo "- Card (platform-specific styling)"
    echo "- Input (platform themes)"
    echo "- Avatar (platform ring colors)"
    echo "- Badge (platform colors)"
    echo "- Header (platform-specific layout)"
    echo "- Platform Theme Hook"
    echo ""
    echo -e "${YELLOW}🎨 Platform variants available:${NC}"
    echo "- boyfanz: Dark underground aesthetic"
    echo "- girlfanz: Elegant feminine design"
    echo "- pupfanz: Playful community theme"
    echo "- transfanz: Inclusive modern design"
    echo "- taboofanz: Bold alternative styling"
    echo ""
    echo -e "${GREEN}✅ Ready to use in platform applications!${NC}"
}

# Run main function
main "$@"