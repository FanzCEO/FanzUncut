# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## TL;DR - BoyFanz Platform Backend (FANZ Ecosystem)

**BoyFanz-3** is a production-ready Node.js/TypeScript backend serving the BoyFanz adult content creator platform (`boyfanz.com`). Built as part of the FANZ Unlimited Network ecosystem with API Gateway, multi-cloud infrastructure, adult-friendly payment processing, real-time monitoring, and mobile backend (ClubCentral app) support.

## 🚀 Quickstart (5 minutes)

```bash
# 1. Sync with main
git pull --rebase

# 2. Environment setup
nvm use                           # Use pinned Node version from .nvmrc
pnpm install --frozen-lockfile    # Install dependencies
cp env/.env.local.example env/.env.local  # Configure environment (edit locally; never commit secrets)

# 3. Validate setup
warp run env:check               # Verify environment variables
warp run deps:sync               # Sync dependencies
warp run port:check              # Check port availability

# 4. Start development
warp run dev:start               # Start development server
# Server runs on http://localhost:5000 (both API and frontend)
```

## 📋 Preflight Checks (Required Before Development)

```bash
warp run env:check     # ✅ Verify required environment variables
warp run port:check    # ✅ Auto-bump/clean if port 5000 is busy
warp run deps:sync     # ✅ Sync pnpm lockfile and modules
```

## ⚡ One Source of Truth Commands

**Never use manual processes. Always use these Warp workflows:**

- **Development**: `warp run dev:start` / `warp run dev:stop`
- **Database**: `warp run db:up` / `warp run db:down` / `warp run db:migrate`
- **Logs**: `warp run logs:tail` (structured JSON logs in `./.logs/`)
- **Port management**: `warp run port:free 5000` (never `kill -9`)

## 🏗️ Architecture Overview

```
[Web/App (BoyFanz)]  [FanzClub/ClubCentral]  [Creator Studio]  [Fan Dash]
                \         |                    |                /
                              [ API Gateway / Edge ]
                                       |
                            [ Feature Flags / AB ]
                                       |
            +------------------ Core Services (K8s) ------------------+
            |  Auth/Identity (FanzSSO)   |   Profiles/Graph           |
            |  MediaHub (upload, scan,   |   Moderation (AI+human)    |
            |  fingerprint, CDN)         |   Notifications            |
            |  Ads Service (placements,  |   Search/Discovery         |
            |  policy, optimizer)        |   Analytics/OTel           |
            |  Payments Orchestrator     |   FanzFinance OS (ledger)  |
            +------------------------------------------------------------------+
                           |              |                  |
                    [Adult-Friendly   [CDN: Cloudflare/   [Object Storage:
                     Gateways: CCBill,  Bunny/G-Core]      R2/B2/Bunny]
                     Segpay, Epoch...]                      
                           |
                     [FanzDash: Super Admin, BI, Security Control Center]
                           |
                     [Ops Dashboards: uptime, latency, errors, payouts]
```

### Key Components

- **Express Server** (`server/index.ts`): Main application entry point with security middleware
- **API Gateway** (`server/services/apiGatewayService.ts`): Service mesh with circuit breakers, rate limiting
- **Database**: PostgreSQL with Drizzle ORM (`shared/schema.ts`)
- **Frontend**: React with Vite bundling (`client/src/`)
- **Authentication**: Dual support (Replit OAuth + local JWT)
- **Mobile Backend**: ClubCentral app APIs (`server/routes/mobileApi.ts`)

## 🌍 Environments & Domains

### Environment Files Strategy
```bash
env/.env.local         # Local development (never commit secrets)
env/.env.local.example # Template with safe defaults
env/.env.staging       # Staging environment variables
env/.env.prod          # Production environment variables
```

### Domain Mapping (Production)
- **BoyFanz**: `boyfanz.com` (primary platform)
- **Related platforms**: GirlFanz (`girlfanz.com`), PupFanz (`pupfanz.com`), TransFanz (`transfanz.com`), TabooFanz (`taboofanz.com`)

### Required Environment Variables
```bash
# Core
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/fanz_db

# Security
JWT_SECRET=your-64-character-secret
SESSION_SECRET=your-32-character-secret

# Observability (OpenTelemetry)
OTEL_SERVICE_NAME=boyfanz-web
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com:4317

# Storage & CDN
CDN_BASE=https://cdn.boyfanz.com
STORAGE_BUCKET=boyfanz-media
STORAGE_REGION=us-east-1

# Payments (Adult-Friendly Only)
PAYMENTS_PROCESSOR=CCBill  # CCBill|Segpay|Epoch|Vendo|Verotel
PAYOUTS_PROVIDER=Paxum     # Paxum|ePayService|Wise|Crypto

# Ads Platform
ADS_API_BASE=http://localhost:4000
```

**⚠️ NEVER commit secrets. Use environment variables or secret managers.**

## 🔧 Essential Development Flows

### Daily Development
```bash
# Start development
warp run dev:start          # Starts Express server with hot reload

# Stop development  
warp run dev:stop           # Clean shutdown with port cleanup

# Monitor logs
warp run logs:tail          # Tail structured logs from ./.logs/

# Database operations
warp run db:up             # Start PostgreSQL (Docker)
warp run db:migrate        # Apply schema migrations
warp run db:down           # Stop database
```

### Testing
```bash
warp run test:unit         # Unit tests with coverage (≥85% required)
warp run test:integration  # Integration tests (API endpoints)
warp run test:load         # Load testing for scaling
warp run a11y:scan         # Accessibility compliance (WCAG 2.2 AA)
```

### Quality Assurance
```bash
warp run qa:check          # Complete QA gate (lint + typecheck + tests)
warp run ads:smoke         # Test ad placement endpoints
warp run payments:smoke    # Test payment gateway integration
```

## 🎯 Quality Gates & Acceptance Criteria

### Testing Requirements
- **Unit Coverage**: ≥85% required for all core services
- **Integration Tests**: Critical flows (login, upload, payment, streaming)
- **Load Testing**: Plan for 10× traffic spikes before major releases
- **Security Testing**: OWASP Top 10 checks on every commit

### Performance Standards
- **API P95 Latency**: < 300ms
- **LCP (Largest Contentful Paint)**: < 2.5s
- **Upload Success Rate**: > 99.9%
- **Payment Success Rate**: > 95%

### Accessibility Compliance
- **WCAG 2.2 AA**: Mandatory baseline (CI fails on regressions)
- **Automated Scanning**: `warp run a11y:scan` in CI/CD
- **Screen Reader Testing**: Manual validation for key flows

### Security Requirements
- **Encryption**: TLS 1.3 in transit, AES-256 at rest
- **Zero Trust**: No default network trust, least privilege IAM
- **Vulnerability Scans**: Dependency audits on every commit
- **Penetration Testing**: Quarterly third-party testing

## 🔐 Security & Compliance

### Data Protection
- **GDPR Compliance**: Data export/delete endpoints implemented
- **Adult Industry Standards**: 18 U.S.C. §2257 record keeping
- **PCI DSS**: Payment card industry security (via adult-friendly processors)

### Infrastructure Security
- **Approved Providers**: Cloudflare, Bunny CDN, G-Core Labs, AWS/GCP/Azure (with caution), DigitalOcean, Linode, Vultr, OVH, Scaleway
- **DRM Protection**: Content encryption and forensic watermarking
- **Geo-blocking**: VPN detection and regional restrictions

### Payment Security
**⚠️ CRITICAL: Never use Stripe or PayPal (banned for adult content)**

**Adult-Friendly Processors Only:**
- **Card Gateways**: CCBill, Segpay, Epoch, Vendo, Verotel, NetBilling, CommerceGate, RocketGate, CentroBill, Payze, Kolektiva
- **Creator Payouts**: Paxum, ePayService, Cosmo Payment, Wise, Payoneer, Crypto (BTC/ETH/USDT/USDC)
- **Risk Management**: Host Merchant Services (HMS) integration for MID management and chargeback monitoring

### Policy References
- **Legal Documentation**: https://Fanz.Foundation/knowledge-base
- **Compliance Frameworks**: All platforms maintain ADA, GDPR, and adult industry compliance

## 📊 Observability & Monitoring

### OpenTelemetry Integration
```bash
# Required in all start scripts
export OTEL_SERVICE_NAME="boyfanz-web"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otel-collector.example.com:4317"
```

### Required Dashboards
- **System Health**: Uptime, Latency (P50/P95), Error rates
- **Business Metrics**: Upload success %, Payment approval %, Creator payout latency
- **Ad Platform**: Impressions, CTR, ROAS, Viewability rates
- **Security**: Failed login attempts, Suspicious activity, Compliance violations

### Structured Logging
- **Log Location**: `./.logs/*.log` (JSON format)
- **Correlation IDs**: Include trace IDs in all log entries
- **Incident SLA**: Detect < 5 min, Resolve < 30 min, Postmortem within 48h

## 📢 Ads Platform Integration

### Required Ad Placements (BoyFanz)
```bash
HEADER              # 970×90 / responsive banner
FOOTER              # 728×90 / responsive 
SIDEPANEL           # 300×600 / 300×250
HOMEPAGE_HERO       # Above-fold hero placement
HOMEPAGE_NATIVE     # In-feed native ads
DASHBOARD_WIDGET    # Creator/fan dashboard tiles
```

### Automated Purchase Flow
1. **Campaign Init** → Adult-friendly gateway checkout (CCBill/Segpay/Epoch)
2. **Payment Success** → Webhook triggers campaign activation
3. **Creative Review** → AI + human moderation for policy compliance
4. **Frequency Capping** → Default 3/day/user (configurable)
5. **Transparency** → "Why this ad?" endpoint for user trust

### Testing
```bash
warp run ads:smoke    # Test placement endpoints and policy validation
```

## 💳 Payments & FanzFinance OS

### Payment Orchestration
- **Regional Routing**: Intelligent gateway selection via FanzDash
- **Adult-Friendly Only**: CCBill (US), Segpay (Global), Epoch (EU), Vendo (LatAm), Verotel (EU)
- **Alternative Methods**: Bank transfers, crypto, mobile wallets (region-dependent)

### FanzFinance OS Integration
- **Double-Entry Ledger**: Real-time balance calculations and reconciliation
- **Transaction Engine**: Automated journal entry generation
- **Financial Reports**: P&L and Balance Sheet generation
- **API-First**: Integrates with Payments Orchestrator and FanzDash

### Creator Payouts
```bash
# Supported payout methods
Paxum              # Primary adult industry standard
ePayService        # Alternative adult-friendly
Wise               # International transfers
Payoneer           # Global marketplace
ACH/SEPA           # Direct bank deposits
Crypto             # BTC, ETH, USDT, USDC
```

### Testing
```bash
warp run payments:smoke    # Test gateway connectivity and sandbox transactions
```

## 🚀 Deployment & Release

### Git Workflow (Housekeeping Rule)
```bash
# Before starting work
git pull --rebase origin main

# After every checkpoint or task completion
git add .
git commit -m "descriptive commit message"
git push origin main    # Keep main branch aligned
```

### Release Process
```bash
# Staging deployment
warp run deploy:staging    # Auto-deploy from main branch

# Production deployment (manual approval required)
warp run deploy:prod       # Manual approval gate

# Emergency rollback (≤5 minutes)
warp run deploy:rollback   # Automated rollback to previous stable
```

### Feature Flags
- **Mandatory**: All new features behind flags
- **Expiration**: ≤90 days (automated cleanup)
- **Canary Rollout**: 1% → 10% → 100% with automatic rollback triggers

## 🔄 Future WARP Instances (Replication Guide)

To replicate this setup for other FANZ platforms (GirlFanz, PupFanz, etc.):

### 1. Copy Core Files
```bash
cp WARP.md ../target-repo/
cp -r .warp/ ../target-repo/
cp -r scripts/ ../target-repo/
```

### 2. Update Configuration
```bash
# Update environment variables
OTEL_SERVICE_NAME=girlfanz-web  # or pupfanz-web, etc.
PORT=5002                       # Different port per platform
ADS_API_BASE=http://localhost:4002

# Update domain mapping
girlfanz.com → GirlFanz platform
pupfanz.com → PupFanz platform
taboofanz.com → TabooFanz platform (replaces EbonyFanz)
```

### 3. Validate Setup
```bash
warp run env:check       # Verify environment configuration
warp run ads:smoke       # Test ad placements
warp run payments:smoke  # Test payment integration
warp run a11y:scan       # Validate accessibility
warp run qa:check        # Complete quality gate
```

## 📋 Checklists & Runbooks

### Pre-Release Checklist
- [ ] `warp run qa:check` passes (lint, typecheck, tests)
- [ ] `warp run a11y:scan` shows no critical issues
- [ ] `warp run ads:smoke` validates ad placements
- [ ] `warp run payments:smoke` confirms gateway connectivity
- [ ] Database migrations tested in staging
- [ ] Feature flags configured with rollback plan
- [ ] Monitoring dashboards show green metrics
- [ ] Security scan shows no high/critical vulnerabilities

### Incident Response Runbook
1. **Detect** (< 5 min): Automated alerts via monitoring
2. **Assess**: Check dashboards for impact scope
3. **Mitigate**: `warp run deploy:rollback` if needed
4. **Communicate**: Update status page and stakeholders
5. **Resolve** (< 30 min): Apply fix or complete rollback
6. **Postmortem** (48h): Document lessons learned

### Accessibility (A11y) Checklist
- [ ] Color contrast ≥4.5:1 for normal text, ≥3:1 for large text
- [ ] All interactive elements keyboard accessible (Tab, Enter, Space)
- [ ] Screen reader compatible (ARIA labels, semantic HTML)
- [ ] No content flashing more than 3 times per second
- [ ] Video content includes captions/transcripts
- [ ] Forms include clear labels and error messages

## 📚 Appendix

### A. Approved Infrastructure Providers (Adult-Content-Friendly)
**Cloud Platforms**: AWS, GCP, Azure (with caution), DigitalOcean, Linode, Vultr, OVH, Scaleway
**CDN Services**: Cloudflare, Bunny CDN, CDN77, G-Core Labs, Fastly, Akamai (adult-friendly tiers)
**Object Storage**: Cloudflare R2, Backblaze B2, Bunny Storage, Wasabi, AWS S3

### B. FANZ Network Domains
**Core Platforms**:
- BoyFanz: `boyfanz.com`
- GirlFanz: `girlfanz.com` 
- PupFanz: `pupfanz.com`
- TransFanz: `transfanz.com`
- TabooFanz: `taboofanz.com` (replaces EbonyFanz)

**Additional Network**: 100+ domains including `fanz.*` variations, regional domains, and specialized community domains. See rules for complete list.

### C. Payment & Payout Providers (Adult-Industry Approved)
**Card Processors**: CCBill, Segpay, Epoch, Vendo, Verotel, NetBilling, CommerceGate, RocketGate, CentroBill, Payze, Kolektiva
**Payout Methods**: Paxum, ePayService, Cosmo Payment, Wise, Payoneer, Skrill, Neteller, ACH/SEPA, Crypto
**Risk Management**: Host Merchant Services (HMS) for MID management and chargeback protection

### D. Key External References
- **FanzDash**: Super admin control center and security hub
- **Policy Documentation**: https://Fanz.Foundation/knowledge-base
- **Developer APIs**: https://developers.boyfanz.com
- **Status Monitoring**: https://status.boyfanz.com

---

**🎯 Remember**: This is a creator-first platform. Every feature must increase creator autonomy, income, or safety. Zero dark patterns, maximum transparency, adult-industry compliant infrastructure only.

**Built with ❤️ for the adult content creator economy**
**© 2024 FANZ Unlimited Network**