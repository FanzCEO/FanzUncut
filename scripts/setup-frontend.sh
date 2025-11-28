#!/bin/bash
# FANZ Frontend Development Environment Setup
# Creates monorepo structure with all platform frontends

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

echo -e "${CYAN}🎨 FANZ Frontend Development Setup${NC}"
echo -e "${CYAN}=================================${NC}"
echo ""

print_status() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✅ DONE]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠️  WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[❌ ERROR]${NC} $1"
}

# Check Node.js version
check_node() {
    print_status "Checking Node.js version..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d 'v' -f 2)
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
        if [ "$MAJOR_VERSION" -ge 18 ]; then
            print_success "Node.js $NODE_VERSION (>= 18 required)"
        else
            print_error "Node.js $NODE_VERSION found, but >= 18 required"
            exit 1
        fi
    else
        print_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
}

# Check npm/yarn
check_package_manager() {
    print_status "Checking package manager..."
    if command -v yarn &> /dev/null; then
        YARN_VERSION=$(yarn --version)
        print_success "Yarn $YARN_VERSION found"
        PKG_MANAGER="yarn"
    elif command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm $NPM_VERSION found"
        PKG_MANAGER="npm"
    else
        print_error "No package manager found. Please install npm or yarn"
        exit 1
    fi
}

# Create monorepo structure
create_monorepo_structure() {
    print_status "Creating frontend monorepo structure..."
    
    mkdir -p "$FRONTEND_ROOT"
    cd "$FRONTEND_ROOT"
    
    # Create monorepo directories
    mkdir -p {apps,packages,tools,docs}
    mkdir -p apps/{boyfanz,girlfanz,pupfanz,transfanz,taboofanz}
    mkdir -p packages/{ui,shared,config,eslint-config}
    mkdir -p tools/{build,deploy,dev}
    
    print_success "Monorepo structure created"
}

# Initialize root package.json
create_root_package_json() {
    print_status "Creating root package.json..."
    
    cat > "$FRONTEND_ROOT/package.json" << 'EOF'
{
  "name": "fanz-frontend",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "tools/*"
  ],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean",
    "type-check": "turbo run type-check",
    "dev:boyfanz": "turbo run dev --filter=boyfanz",
    "dev:girlfanz": "turbo run dev --filter=girlfanz",
    "dev:pupfanz": "turbo run dev --filter=pupfanz",
    "dev:transfanz": "turbo run dev --filter=transfanz",
    "dev:taboofanz": "turbo run dev --filter=taboofanz",
    "build:all": "turbo run build --filter='./apps/*'",
    "deploy:staging": "turbo run deploy:staging --filter='./apps/*'",
    "deploy:production": "turbo run deploy:production --filter='./apps/*'"
  },
  "devDependencies": {
    "turbo": "latest",
    "@types/node": "latest",
    "typescript": "latest",
    "eslint": "latest",
    "prettier": "latest"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "packageManager": "npm@10.0.0"
}
EOF
    
    print_success "Root package.json created"
}

# Create turbo.json configuration
create_turbo_config() {
    print_status "Creating Turbo configuration..."
    
    cat > "$FRONTEND_ROOT/turbo.json" << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    },
    "deploy:staging": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "deploy:production": {
      "dependsOn": ["build"],
      "outputs": []
    }
  }
}
EOF
    
    print_success "Turbo configuration created"
}

# Create shared TypeScript configuration
create_typescript_config() {
    print_status "Creating TypeScript configuration..."
    
    cat > "$FRONTEND_ROOT/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@fanz/ui": ["./packages/ui/src"],
      "@fanz/shared": ["./packages/shared/src"],
      "@fanz/config": ["./packages/config/src"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "dist"
  ]
}
EOF
    
    print_success "TypeScript configuration created"
}

# Create shared UI package
create_ui_package() {
    print_status "Creating shared UI package..."
    
    cd "$FRONTEND_ROOT/packages/ui"
    
    cat > package.json << 'EOF'
{
  "name": "@fanz/ui",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "module": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.263.1",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.61",
    "@types/react-dom": "^18.2.19",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^3.4.1",
    "tsup": "^8.0.2",
    "typescript": "^5.3.3"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
EOF
    
    mkdir -p src/components/ui
    mkdir -p src/lib
    mkdir -p src/hooks
    
    # Create utility functions
    cat > src/lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF
    
    # Create main export file
    cat > src/index.ts << 'EOF'
// Components
export * from "./components/ui"

// Hooks
export * from "./hooks"

// Utils
export * from "./lib/utils"
EOF
    
    print_success "Shared UI package created"
}

# Create shared package
create_shared_package() {
    print_status "Creating shared package..."
    
    cd "$FRONTEND_ROOT/packages/shared"
    
    cat > package.json << 'EOF'
{
  "name": "@fanz/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "module": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "tsup": "^8.0.2",
    "typescript": "^5.3.3"
  }
}
EOF
    
    mkdir -p src/{types,constants,utils,api}
    
    # Create platform types
    cat > src/types/platform.ts << 'EOF'
export type Platform = 
  | 'boyfanz'
  | 'girlfanz' 
  | 'pupfanz'
  | 'transfanz'
  | 'taboofanz'

export interface PlatformTheme {
  name: Platform
  displayName: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  slogan: string
  domain: string
}

export interface User {
  id: string
  username: string
  email: string
  displayName: string
  avatar?: string
  platforms: Platform[]
  createdAt: string
  updatedAt: string
}

export interface Creator extends User {
  isVerified: boolean
  subscriptionPrice: number
  subscriberCount: number
  earnings: number
}
EOF
    
    # Create platform constants
    cat > src/constants/platforms.ts << 'EOF'
import { PlatformTheme } from '../types/platform'

export const PLATFORM_THEMES: Record<string, PlatformTheme> = {
  boyfanz: {
    name: 'boyfanz',
    displayName: 'BoyFanz',
    primaryColor: '#ff0000',
    secondaryColor: '#d4af37', 
    accentColor: '#ffffff',
    backgroundColor: '#0a0a0a',
    textColor: '#ffffff',
    slogan: 'Every Man\'s Playground',
    domain: 'boyfanz.com'
  },
  girlfanz: {
    name: 'girlfanz',
    displayName: 'GirlFanz',
    primaryColor: '#ff69b4',
    secondaryColor: '#d4af37',
    accentColor: '#ffffff', 
    backgroundColor: '#fdf7f0',
    textColor: '#2d2d2d',
    slogan: 'Empowered Expression',
    domain: 'girlfanz.com'
  },
  pupfanz: {
    name: 'pupfanz',
    displayName: 'PupFanz',
    primaryColor: '#ff8c00',
    secondaryColor: '#4169e1',
    accentColor: '#ffffff',
    backgroundColor: '#fff8f0', 
    textColor: '#333333',
    slogan: 'Community Playground',
    domain: 'pupfanz.com'
  },
  transfanz: {
    name: 'transfanz',
    displayName: 'TransFanz',
    primaryColor: '#00bcd4',
    secondaryColor: '#ffffff',
    accentColor: '#ff69b4',
    backgroundColor: '#f8f9fa',
    textColor: '#212529',
    slogan: 'Authentic Stories', 
    domain: 'transfanz.com'
  },
  taboofanz: {
    name: 'taboofanz',
    displayName: 'TabooFanz',
    primaryColor: '#8a2be2',
    secondaryColor: '#ffd700',
    accentColor: '#ffffff',
    backgroundColor: '#1a0d1a',
    textColor: '#e6e6e6',
    slogan: 'Beyond Boundaries',
    domain: 'taboofanz.com'
  }
}
EOF
    
    # Create main export
    cat > src/index.ts << 'EOF'
export * from './types/platform'
export * from './constants/platforms'
EOF
    
    print_success "Shared package created"
}

# Create platform applications
create_platform_apps() {
    local platforms=("boyfanz" "girlfanz" "pupfanz" "transfanz" "taboofanz")
    
    for platform in "${platforms[@]}"; do
        print_status "Creating $platform Next.js application..."
        
        cd "$FRONTEND_ROOT/apps"
        
        # Create Next.js app
        npx create-next-app@latest "$platform" \
          --typescript \
          --tailwind \
          --eslint \
          --app \
          --src-dir \
          --import-alias "@/*" \
          --no-git
        
        cd "$platform"
        
        # Install additional dependencies
        if [ "$PKG_MANAGER" = "yarn" ]; then
            yarn add @tanstack/react-query zustand @hookform/react-hook-form zod framer-motion
            yarn add -D @types/node
        else
            npm install @tanstack/react-query zustand @hookform/react-hook-form zod framer-motion
            npm install -D @types/node
        fi
        
        # Create platform-specific configuration
        cat > next.config.js << EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    PLATFORM: '$platform',
    PLATFORM_DOMAIN: '\${process.env.NODE_ENV === 'production' ? '$platform.com' : 'localhost:3000'}',
  }
}

module.exports = nextConfig
EOF
        
        print_success "$platform application created"
    done
}

# Create development scripts
create_dev_scripts() {
    print_status "Creating development scripts..."
    
    cd "$FRONTEND_ROOT"
    
    # Create start script
    cat > start-dev.sh << 'EOF'
#!/bin/bash
# Start development servers for all platforms

echo "🚀 Starting FANZ Frontend Development Servers"
echo "============================================="

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🌐 Available platforms:"
echo "- BoyFanz:    http://localhost:3001"
echo "- GirlFanz:   http://localhost:3002" 
echo "- PupFanz:    http://localhost:3003"
echo "- TransFanz:  http://localhost:3004"
echo "- TabooFanz:  http://localhost:3005"
echo ""

# Start all platforms concurrently
npm run dev
EOF
    
    chmod +x start-dev.sh
    
    # Create individual platform start scripts
    local platforms=("boyfanz" "girlfanz" "pupfanz" "transfanz" "taboofanz")
    local port=3001
    
    for platform in "${platforms[@]}"; do
        cat > "start-${platform}.sh" << EOF
#!/bin/bash
echo "🚀 Starting $platform development server on port $port"
cd apps/$platform && npm run dev -- -p $port
EOF
        chmod +x "start-${platform}.sh"
        ((port++))
    done
    
    print_success "Development scripts created"
}

# Create environment template
create_env_template() {
    print_status "Creating environment template..."
    
    cat > "$FRONTEND_ROOT/.env.example" << 'EOF'
# FANZ Frontend Environment Configuration
# Copy this file to .env.local and fill in your values

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=ws://localhost:5000

# Authentication
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# Platform Configuration
NEXT_PUBLIC_PLATFORM=boyfanz
NEXT_PUBLIC_PLATFORM_DOMAIN=localhost:3000

# Analytics (optional)
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_HOTJAR_ID=

# Feature Flags
NEXT_PUBLIC_ENABLE_LIVE_STREAMING=true
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_PAYMENTS=true
EOF
    
    print_success "Environment template created"
}

# Create README
create_frontend_readme() {
    print_status "Creating frontend README..."
    
    cat > "$FRONTEND_ROOT/README.md" << 'EOF'
# 🎨 FANZ Frontend Ecosystem

Monorepo containing all FANZ platform frontends and shared packages.

## 🏗️ Structure

```
frontend/
├── apps/                    # Platform applications
│   ├── boyfanz/            # BoyFanz.com
│   ├── girlfanz/           # GirlFanz.com
│   ├── pupfanz/            # PupFanz.com
│   ├── transfanz/          # TransFanz.com
│   └── taboofanz/          # TabooFanz.com
├── packages/               # Shared packages
│   ├── ui/                 # Shared UI components
│   ├── shared/            # Shared utilities & types
│   └── config/            # Shared configuration
└── tools/                 # Development tools
```

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start all platforms:**
   ```bash
   ./start-dev.sh
   ```

3. **Start individual platform:**
   ```bash
   ./start-boyfanz.sh
   ./start-girlfanz.sh
   ./start-pupfanz.sh
   ./start-transfanz.sh
   ./start-taboofanz.sh
   ```

## 🌐 Platform URLs (Development)

- **BoyFanz**: http://localhost:3001
- **GirlFanz**: http://localhost:3002
- **PupFanz**: http://localhost:3003
- **TransFanz**: http://localhost:3004
- **TabooFanz**: http://localhost:3005

## 📦 Available Scripts

- `npm run dev` - Start all platforms in development
- `npm run build` - Build all platforms
- `npm run test` - Run tests across all packages
- `npm run lint` - Lint all packages
- `npm run type-check` - TypeScript type checking

## 🎨 Platform Themes

Each platform has its own unique theme and branding:

- **BoyFanz** - Dark underground fight club aesthetic
- **GirlFanz** - Elegant feminine design with luxury touches
- **PupFanz** - Playful community-focused theme
- **TransFanz** - Inclusive modern design with pride elements
- **TabooFanz** - Bold alternative styling

## 🔧 Development

1. **Adding new components:**
   ```bash
   # Add to shared UI package
   cd packages/ui/src/components
   # Create your component
   ```

2. **Platform-specific features:**
   ```bash
   # Add to specific platform
   cd apps/boyfanz/src/components
   # Create platform-specific component
   ```

3. **Shared utilities:**
   ```bash
   # Add to shared package
   cd packages/shared/src
   # Create utility functions
   ```

## 🚀 Deployment

Each platform can be deployed independently:

```bash
# Build specific platform
npm run build --filter=boyfanz

# Deploy to Vercel
vercel --prod
```

## 📚 Documentation

- [Backend API Documentation](../README.md)
- [Design System Guide](./packages/ui/README.md)
- [Platform Themes](./docs/themes.md)
- [Development Guide](./docs/development.md)
EOF
    
    print_success "Frontend README created"
}

# Main execution
main() {
    echo -e "${PURPLE}Starting FANZ Frontend Development Setup...${NC}"
    echo ""
    
    check_node
    check_package_manager
    create_monorepo_structure
    create_root_package_json
    create_turbo_config
    create_typescript_config
    create_ui_package
    create_shared_package
    create_platform_apps
    create_dev_scripts
    create_env_template
    create_frontend_readme
    
    echo ""
    print_success "🎉 FANZ Frontend Development Environment Setup Complete!"
    echo ""
    echo -e "${CYAN}📁 Frontend structure created at: $FRONTEND_ROOT${NC}"
    echo -e "${CYAN}🚀 Next steps:${NC}"
    echo "1. cd $FRONTEND_ROOT"
    echo "2. npm install"
    echo "3. ./start-dev.sh"
    echo ""
    echo -e "${YELLOW}🌐 Platform Development URLs:${NC}"
    echo "- BoyFanz:    http://localhost:3001"
    echo "- GirlFanz:   http://localhost:3002"
    echo "- PupFanz:    http://localhost:3003"
    echo "- TransFanz:  http://localhost:3004"
    echo "- TabooFanz:  http://localhost:3005"
    echo ""
    echo -e "${GREEN}✅ Ready for frontend development!${NC}"
}

# Run main function
main "$@"