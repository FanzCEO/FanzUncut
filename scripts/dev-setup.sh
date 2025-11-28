#!/bin/bash
# FANZ Ecosystem Development Environment Setup
# Comprehensive setup script for local development

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NODE_VERSION="20"
POSTGRES_VERSION="16"

echo -e "${CYAN}🚀 FANZ Ecosystem Development Environment Setup${NC}"
echo -e "${CYAN}=================================================${NC}"

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        local current_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$current_version" -ge "$NODE_VERSION" ]; then
            return 0
        fi
    fi
    return 1
}

# Function to install Node.js using nvm if needed
install_nodejs() {
    print_status "Checking Node.js installation..."
    
    if check_node_version; then
        print_success "Node.js $(node -v) is already installed"
        return 0
    fi
    
    print_status "Installing Node.js $NODE_VERSION..."
    
    # Install nvm if not present
    if ! command_exists nvm; then
        print_status "Installing NVM..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi
    
    # Install and use Node.js
    nvm install $NODE_VERSION
    nvm use $NODE_VERSION
    nvm alias default $NODE_VERSION
    
    print_success "Node.js $NODE_VERSION installed successfully"
}

# Function to check PostgreSQL
check_postgresql() {
    print_status "Checking PostgreSQL installation..."
    
    if command_exists psql && command_exists pg_config; then
        local version=$(pg_config --version | grep -oE '[0-9]+' | head -1)
        if [ "$version" -ge "$POSTGRES_VERSION" ]; then
            print_success "PostgreSQL $version is installed"
            return 0
        fi
    fi
    
    print_warning "PostgreSQL $POSTGRES_VERSION or higher required"
    print_status "Please install PostgreSQL $POSTGRES_VERSION:"
    print_status "  macOS: brew install postgresql@$POSTGRES_VERSION"
    print_status "  Ubuntu: apt install postgresql-$POSTGRES_VERSION postgresql-client-$POSTGRES_VERSION"
    print_status "  Or use Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:$POSTGRES_VERSION"
    
    return 1
}

# Function to install project dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Install npm dependencies
    if [ -f "package.json" ]; then
        npm install
        print_success "NPM dependencies installed"
    else
        print_warning "No package.json found, creating basic setup..."
        
        # Create basic package.json
        cat > package.json << EOF
{
  "name": "fanz-ecosystem",
  "version": "1.0.0",
  "description": "FANZ Unlimited Network - Complete Ecosystem Backend",
  "main": "server/index.js",
  "type": "module",
  "scripts": {
    "dev": "node --watch server/index.js",
    "start": "node server/index.js",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "tsc -p server/tsconfig.json",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "check": "tsc --noEmit",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "lint": "eslint . --ext .js,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.ts,.tsx --fix",
    "format": "prettier --write .",
    "validate": "npm run check && npm run lint && npm run test"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "cookie-parser": "^1.4.6",
    "compression": "^1.7.4",
    "ws": "^8.14.2",
    "axios": "^1.6.2",
    "zod": "^3.22.4",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "drizzle-orm": "^0.29.1",
    "postgres": "^3.4.3",
    "pino": "^8.17.1",
    "@tanstack/react-query": "^5.8.4",
    "wouter": "^2.12.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/cookie-parser": "^1.4.6",
    "@types/compression": "^1.7.5",
    "@types/ws": "^8.5.10",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/jest": "^29.5.8",
    "@types/supertest": "^2.0.16",
    "typescript": "^5.3.2",
    "vite": "^5.0.2",
    "@vitejs/plugin-react": "^4.1.1",
    "tailwindcss": "^3.3.6",
    "drizzle-kit": "^0.20.6",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "node-fetch": "^3.3.2",
    "@babel/core": "^7.23.5",
    "@babel/preset-env": "^7.23.5",
    "babel-jest": "^29.7.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
EOF

        npm install
        print_success "Basic package.json created and dependencies installed"
    fi
}

# Function to create environment file
create_env_file() {
    print_status "Setting up environment configuration..."
    
    cd "$PROJECT_ROOT"
    
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# FANZ Ecosystem Environment Configuration
# Development Environment Settings

# Application
NODE_ENV=development
PORT=5000
WEB_APP_URL=http://localhost:5000
API_URL=http://localhost:5000/api

# Database
DATABASE_URL=postgresql://fanz_user:fanz_password@localhost:5432/fanz_dev

# Security
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
BCRYPT_ROUNDS=12

# Replit Integration (for development)
REPL_ID=fanz-dev-$(date +%s)
REPLIT_DOMAINS=localhost:5000
ISSUER_URL=https://replit.com/oidc

# Storage
PUBLIC_OBJECT_SEARCH_PATHS=/uploads/public
PRIVATE_OBJECT_DIR=/uploads/private

# Email & Notifications
OTP_EMAIL_FROM=noreply@boyfanz.com
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass

# External Services
VERIFYMY_API_URL=https://api.verifymy.com
VERIFYMY_API_KEY=your-verifymy-api-key

# WebSocket
WS_BASE_URL=ws://localhost:3001

# API Gateway Configuration
GATEWAY_RATE_LIMIT_MAX=10000
GATEWAY_RATE_LIMIT_WINDOW=60000
GATEWAY_CACHE_SIZE=100
GATEWAY_CIRCUIT_BREAKER_THRESHOLD=5

# Service URLs (all localhost for development)
INFRASTRUCTURE_SERVICE_URL=http://localhost:5000
SECURITY_SERVICE_URL=http://localhost:5000
MOBILE_SERVICE_URL=http://localhost:5000
MONITORING_SERVICE_URL=http://localhost:5000
FANZDASH_SERVICE_URL=http://localhost:6000
PAYMENTS_SERVICE_URL=http://localhost:5000
MEDIA_SERVICE_URL=http://localhost:7000

# Platform Service URLs
BOYFANZ_SERVICE_URL=http://localhost:5001
GIRLFANZ_SERVICE_URL=http://localhost:5002
PUPFANZ_SERVICE_URL=http://localhost:5003
TRANSFANZ_SERVICE_URL=http://localhost:5004
TABOOFANZ_SERVICE_URL=http://localhost:5005

# Development Flags
DEBUG=true
VERBOSE_LOGGING=true
ENABLE_CORS=true
ENABLE_MORGAN=true

# Testing
TEST_BASE_URL=http://localhost:5000
TEST_API_KEY=test-api-key-development-only
EOF

        print_success "Environment file (.env) created with development settings"
    else
        print_warning "Environment file (.env) already exists, skipping..."
    fi
}

# Function to setup database
setup_database() {
    print_status "Setting up development database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_warning "PostgreSQL is not running. Please start PostgreSQL service:"
        print_status "  macOS: brew services start postgresql"
        print_status "  Linux: sudo systemctl start postgresql"
        print_status "  Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=fanz_password postgres:$POSTGRES_VERSION"
        return 1
    fi
    
    # Create database and user
    print_status "Creating database and user..."
    
    # Use environment variables or defaults
    DB_NAME="fanz_dev"
    DB_USER="fanz_user"
    DB_PASS="fanz_password"
    
    # Create user and database (ignore errors if they already exist)
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
    
    print_success "Database setup completed"
}

# Function to create development scripts
create_dev_scripts() {
    print_status "Creating development scripts..."
    
    mkdir -p "$PROJECT_ROOT/scripts"
    
    # Start script
    cat > "$PROJECT_ROOT/scripts/start-dev.sh" << 'EOF'
#!/bin/bash
# Development server startup script

set -e

echo "🚀 Starting FANZ Ecosystem Development Server..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Run scripts/dev-setup.sh first."
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Start the development server
echo "📡 Starting server on port $PORT..."
npm run dev
EOF

    # Test script
    cat > "$PROJECT_ROOT/scripts/run-tests.sh" << 'EOF'
#!/bin/bash
# Test runner script

set -e

echo "🧪 Running FANZ Ecosystem Tests..."

# Set test environment
export NODE_ENV=test
export PORT=5000

# Run tests
echo "Running integration tests..."
npm test

echo "✅ All tests completed!"
EOF

    # Health check script
    cat > "$PROJECT_ROOT/scripts/health-check.sh" << 'EOF'
#!/bin/bash
# Health check script for all services

set -e

BASE_URL="http://localhost:5000"

echo "🏥 FANZ Ecosystem Health Check"
echo "=============================="

# Function to check endpoint
check_endpoint() {
    local endpoint="$1"
    local name="$2"
    
    if curl -s -f "$BASE_URL$endpoint" > /dev/null; then
        echo "✅ $name: HEALTHY"
    else
        echo "❌ $name: UNHEALTHY"
    fi
}

# Check all service endpoints
check_endpoint "/api/health" "Main Application"
check_endpoint "/api/gateway/health" "API Gateway"
check_endpoint "/api/infrastructure/health" "Infrastructure Service"
check_endpoint "/api/security/health" "Security Service"
check_endpoint "/api/mobile/health" "Mobile Backend"
check_endpoint "/api/monitoring/health" "Monitoring Service"

echo ""
echo "Health check completed!"
EOF

    # Make scripts executable
    chmod +x "$PROJECT_ROOT/scripts/"*.sh
    
    print_success "Development scripts created"
}

# Function to create TypeScript configuration
create_typescript_config() {
    print_status "Setting up TypeScript configuration..."
    
    cd "$PROJECT_ROOT"
    
    if [ ! -f "tsconfig.json" ]; then
        cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./server/*"],
      "@/services/*": ["./server/services/*"],
      "@/routes/*": ["./server/routes/*"],
      "@/middleware/*": ["./server/middleware/*"]
    }
  },
  "include": [
    "server/**/*",
    "client/**/*",
    "shared/**/*",
    "test/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "build",
    "coverage"
  ]
}
EOF
        print_success "TypeScript configuration created"
    else
        print_warning "TypeScript configuration already exists"
    fi
}

# Function to setup git hooks
setup_git_hooks() {
    print_status "Setting up Git hooks..."
    
    cd "$PROJECT_ROOT"
    
    if [ -d ".git" ]; then
        mkdir -p .git/hooks
        
        # Pre-commit hook
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook for FANZ Ecosystem

set -e

echo "🔍 Running pre-commit checks..."

# Check if there are any staged files
if git diff --staged --quiet; then
    echo "No staged files found"
    exit 0
fi

# Run type checking
echo "Checking TypeScript..."
npm run check

# Run linting
echo "Running ESLint..."
npm run lint

# Run tests
echo "Running tests..."
npm run test

echo "✅ Pre-commit checks passed!"
EOF

        chmod +x .git/hooks/pre-commit
        print_success "Git hooks configured"
    else
        print_warning "Not a Git repository, skipping Git hooks setup"
    fi
}

# Function to validate setup
validate_setup() {
    print_status "Validating development environment setup..."
    
    cd "$PROJECT_ROOT"
    
    local errors=0
    
    # Check Node.js
    if ! check_node_version; then
        print_error "Node.js $NODE_VERSION or higher required"
        ((errors++))
    fi
    
    # Check npm dependencies
    if [ ! -d "node_modules" ]; then
        print_error "npm dependencies not installed"
        ((errors++))
    fi
    
    # Check environment file
    if [ ! -f ".env" ]; then
        print_error "Environment file (.env) missing"
        ((errors++))
    fi
    
    # Check TypeScript
    if [ ! -f "tsconfig.json" ]; then
        print_error "TypeScript configuration missing"
        ((errors++))
    fi
    
    # Check database connection (optional)
    if command_exists psql; then
        if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
            print_success "PostgreSQL connection available"
        else
            print_warning "PostgreSQL not running (optional for testing API endpoints)"
        fi
    fi
    
    if [ $errors -eq 0 ]; then
        print_success "✅ Development environment validation passed!"
        return 0
    else
        print_error "❌ Development environment validation failed with $errors errors"
        return 1
    fi
}

# Main execution
main() {
    print_status "Starting development environment setup..."
    
    # Create project directories
    mkdir -p "$PROJECT_ROOT/server/services"
    mkdir -p "$PROJECT_ROOT/server/routes"
    mkdir -p "$PROJECT_ROOT/server/middleware"
    mkdir -p "$PROJECT_ROOT/client/src"
    mkdir -p "$PROJECT_ROOT/shared"
    mkdir -p "$PROJECT_ROOT/test"
    mkdir -p "$PROJECT_ROOT/scripts"
    mkdir -p "$PROJECT_ROOT/docs"
    
    # Run setup steps
    install_nodejs
    check_postgresql
    install_dependencies
    create_env_file
    create_typescript_config
    create_dev_scripts
    setup_git_hooks
    
    # Optional: setup database (can fail gracefully)
    setup_database || print_warning "Database setup skipped (PostgreSQL not available)"
    
    # Validate setup
    if validate_setup; then
        print_success ""
        print_success "🎉 FANZ Ecosystem Development Environment Setup Complete!"
        print_success "===================================================="
        print_success ""
        print_success "Next steps:"
        print_success "1. Start the development server: ./scripts/start-dev.sh"
        print_success "2. Run health checks: ./scripts/health-check.sh"
        print_success "3. Run tests: ./scripts/run-tests.sh"
        print_success "4. Open http://localhost:5000 in your browser"
        print_success ""
        print_success "API Endpoints:"
        print_success "- Gateway: http://localhost:5000/api/gateway"
        print_success "- Mobile: http://localhost:5000/api/mobile/config"
        print_success "- Infrastructure: http://localhost:5000/api/infrastructure/health"
        print_success "- Security: http://localhost:5000/api/security/health"
        print_success "- Monitoring: http://localhost:5000/api/monitoring/health"
        print_success ""
        print_success "Documentation:"
        print_success "- Mobile SDK: ./MOBILE_SDK_GUIDE.md"
        print_success "- API Gateway: ./API_GATEWAY_STATUS.md"
        print_success "- Implementation Status: ./IMPLEMENTATION_STATUS.md"
    else
        print_error "❌ Setup completed with errors. Please check the messages above."
        exit 1
    fi
}

# Run main function
main "$@"