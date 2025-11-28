# Contributing to FANZ Ecosystem

Welcome to the FANZ contributor community! We're excited you're interested in helping build the future of creator economy platforms. This guide will help you get started and ensure your contributions align with our creator-first mission.

## 🎯 Our Mission

FANZ is built on the principle that **creators come first**. Every contribution should:
- **Increase creator autonomy** - Give creators more control over their content and business
- **Boost creator income** - Help creators earn more through better tools and features  
- **Enhance creator safety** - Protect creators from exploitation, harassment, and security threats
- **Improve fan experience** - Make it easier for fans to support their favorite creators

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 20+** (LTS recommended)
- **pnpm 9+** (we use pnpm, not npm/yarn)
- **Docker 24+** (for local development)
- **Git 2.40+** with GPG signing configured
- **GitHub account** with 2FA enabled

### Development Environment Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub first, then:
   git clone https://github.com/YOUR_USERNAME/FANZ-Unified-Ecosystem.git
   cd FANZ-Unified-Ecosystem
   ```

2. **Install Dependencies**
   ```bash
   # Install using pnpm only
   pnpm install
   
   # Verify installation
   pnpm run verify
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp env/.env.example env/.env.local
   
   # Edit with your local settings
   # See env/README.md for configuration details
   ```

4. **Start Development**
   ```bash
   # Start all services
   pnpm dev
   
   # Or start specific services
   pnpm dev:app boyfanz
   pnpm dev:service auth
   ```

### Development Standards

#### Code Quality Requirements
- **TypeScript**: All new code must be TypeScript
- **Linting**: Code must pass ESLint and Prettier checks
- **Testing**: Minimum 85% test coverage for new code
- **Documentation**: All public APIs must be documented

#### Accessibility Requirements
- **WCAG 2.2 AA**: All UI changes must meet accessibility standards
- **Keyboard Navigation**: Full keyboard accessibility required
- **Screen Reader**: Proper ARIA labels and descriptions
- **Color Contrast**: Minimum 4.5:1 contrast ratio

#### Security Requirements
- **No Secrets**: Never commit API keys, passwords, or secrets
- **Input Validation**: All user inputs must be validated and sanitized
- **SQL Injection**: Use parameterized queries only
- **XSS Protection**: Escape all user-generated content

## 📝 Contribution Types

### 🐛 Bug Reports

Found a bug? Help us fix it!

**Before Reporting:**
- Search existing issues to avoid duplicates
- Test on the latest version
- Gather reproduction steps

**Use our bug report template:**
```markdown
**Bug Description**
A clear description of what the bug is.

**Creator Impact**
How does this affect creators? (earnings, safety, autonomy)

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
What should happen instead?

**Screenshots**
If applicable, add screenshots.

**Environment**
- Platform: [BoyFanz/GirlFanz/PupFanz/etc.]
- Browser: [e.g. Chrome 91]
- Device: [e.g. iPhone 12, Desktop]
```

### 💡 Feature Requests

Have an idea that would help creators? We'd love to hear it!

**Feature Request Template:**
```markdown
**Feature Summary**
One-line description of the feature.

**Creator Benefit**
How will this help creators earn more, stay safer, or have more control?

**User Story**
As a [creator/fan/admin], I want [goal] so that [benefit].

**Acceptance Criteria**
- [ ] Feature works on mobile and desktop
- [ ] Meets WCAG 2.2 AA accessibility standards
- [ ] Includes proper error handling
- [ ] Has comprehensive test coverage

**Additional Context**
Mockups, examples, or related issues.
```

### 🔧 Code Contributions

#### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-creator-tool
   # or
   git checkout -b fix/payment-bug
   # or  
   git checkout -b docs/api-improvements
   ```

2. **Make Your Changes**
   - Follow our coding standards
   - Write/update tests
   - Update documentation
   - Test locally

3. **Commit Your Changes**
   ```bash
   # Use conventional commits
   git commit -m "feat: add creator earnings dashboard"
   git commit -m "fix: resolve payment processing timeout"
   git commit -m "docs: update API authentication guide"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/amazing-creator-tool
   # Create PR through GitHub UI
   ```

#### PR Requirements Checklist

**Before submitting your PR, ensure:**

- [ ] **Creator-First Impact**: Clearly describe how this helps creators
- [ ] **Code Quality**: Passes all linting and formatting checks
- [ ] **Tests**: Maintains or improves test coverage (≥85%)
- [ ] **Accessibility**: Meets WCAG 2.2 AA standards
- [ ] **Security**: No security vulnerabilities introduced
- [ ] **Performance**: No significant performance regressions
- [ ] **Documentation**: Updates relevant documentation
- [ ] **Changelog**: Adds entry to CHANGELOG.md if applicable

#### Commit Message Format

We use [Conventional Commits](https://conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(payments): add cryptocurrency payout support
fix(auth): resolve session timeout on mobile devices
docs(api): update creator API authentication examples
```

## 🏗️ Development Guidelines

### Project Structure

```
fanz-ecosystem/
├── apps/                   # Platform applications
│   ├── boyfanz/           # BoyFanz platform
│   ├── girlfanz/          # GirlFanz platform
│   └── dashboard/         # FanzDash admin
├── packages/              # Shared packages
│   ├── ui/                # Component library
│   ├── auth/              # Authentication SDK
│   └── payments/          # Payment processing
├── services/              # Backend microservices
│   ├── api-gateway/       # API Gateway
│   ├── auth-service/      # Authentication
│   └── content-service/   # Content management
└── docs/                  # Documentation
```

### Coding Standards

#### TypeScript
```typescript
// Good: Explicit types, clear naming
interface CreatorEarnings {
  userId: string;
  totalEarnings: number;
  currency: string;
  payoutMethods: PayoutMethod[];
}

// Bad: Any types, unclear naming
interface Stuff {
  id: any;
  amount: any;
  data: any;
}
```

#### React Components
```tsx
// Good: Typed props, accessible, documented
interface CreatorDashboardProps {
  /** Creator's user ID */
  creatorId: string;
  /** Whether to show earnings in real-time */
  realTimeUpdates?: boolean;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  creatorId,
  realTimeUpdates = false,
}) => {
  return (
    <div role="main" aria-label="Creator Dashboard">
      {/* Component content */}
    </div>
  );
};
```

#### API Design
```typescript
// Good: RESTful, typed, consistent
export interface CreateContentRequest {
  title: string;
  description: string;
  contentType: 'image' | 'video' | 'audio';
  tags: string[];
  pricing: PricingModel;
}

export interface CreateContentResponse {
  contentId: string;
  uploadUrl: string;
  status: 'pending' | 'approved' | 'rejected';
}
```

### Testing Standards

#### Unit Tests
```typescript
describe('CreatorEarningsCalculator', () => {
  it('should calculate creator earnings after platform fees', () => {
    const grossEarnings = 100;
    const platformFeePercent = 15;
    
    const netEarnings = calculateCreatorEarnings(grossEarnings, platformFeePercent);
    
    expect(netEarnings).toBe(85);
  });
  
  it('should handle zero earnings gracefully', () => {
    const netEarnings = calculateCreatorEarnings(0, 15);
    expect(netEarnings).toBe(0);
  });
});
```

#### Integration Tests
```typescript
describe('Creator Payment Flow', () => {
  it('should process creator payout end-to-end', async () => {
    // Arrange
    const creator = await createTestCreator();
    const earnings = await addCreatorEarnings(creator.id, 100);
    
    // Act
    const payout = await requestPayout(creator.id, 'paxum');
    
    // Assert
    expect(payout.status).toBe('processing');
    expect(payout.amount).toBe(85); // After fees
  });
});
```

## 🔍 Code Review Process

### What Reviewers Look For

1. **Creator Impact**: Does this genuinely help creators?
2. **Code Quality**: Is it readable, maintainable, and well-tested?
3. **Security**: Are there any security vulnerabilities?
4. **Performance**: Does it impact platform performance?
5. **Accessibility**: Can all users access this feature?
6. **Consistency**: Does it follow our established patterns?

### Review Timeline

- **Bug fixes**: 1-2 days
- **Small features**: 2-3 days  
- **Large features**: 3-7 days
- **Architecture changes**: 1-2 weeks

### Addressing Review Feedback

1. **Respond promptly** to review comments
2. **Ask questions** if feedback isn't clear
3. **Make requested changes** in new commits (don't force-push)
4. **Explain your reasoning** for any pushback
5. **Thank reviewers** for their time and insights

## 🎖️ Recognition & Rewards

### Contributor Levels

**🌟 Community Contributor**
- Submitted first accepted PR
- Helped with documentation or bug reports

**🚀 Regular Contributor**
- 5+ accepted PRs
- Consistent code quality
- Helps other contributors

**💎 Core Contributor** 
- 20+ accepted PRs
- Significant feature contributions
- Mentors new contributors

**🏆 Maintainer**
- Trusted with merge permissions
- Leads feature development
- Represents FANZ in community

### Rewards Program

- **Swag**: FANZ t-shirts, stickers, and branded items
- **Recognition**: Featured in release notes and social media
- **Access**: Early access to new features and platforms
- **Events**: Invitations to FANZ contributor meetups
- **Credits**: FANZ platform credits for testing

## 📞 Getting Help

### Community Support

- **Discord**: [FANZ Developer Community](https://discord.gg/fanz-devs)
- **GitHub Discussions**: [Project Discussions](https://github.com/FanzCEO/FANZ-Unified-Ecosystem/discussions)
- **Stack Overflow**: Use tag `fanz-ecosystem`

### Direct Support

- **Technical Questions**: developers@fanz.network
- **Contribution Issues**: contributors@fanz.network
- **Security Concerns**: security@fanz.network

### Office Hours

Join our weekly contributor office hours:
- **When**: Fridays 3-4 PM EST
- **Where**: [Zoom Link](https://fanz.network/contributor-office-hours)
- **What**: Q&A, feature discussions, pair programming

## 📚 Additional Resources

### Learning Resources
- [FANZ Architecture Overview](docs/architecture.md)
- [API Documentation](https://docs.fanz.network/api)
- [Creator Platform Best Practices](docs/creator-best-practices.md)

### Development Tools
- [FANZ CLI](https://github.com/FanzCEO/fanz-cli) - Development utilities
- [Component Library](https://storybook.fanz.network) - UI components
- [Testing Utilities](packages/testing/README.md) - Test helpers

## 🙏 Thank You

Every contribution, no matter how small, helps make FANZ better for creators worldwide. Whether you're fixing a typo, reporting a bug, or building a major feature, you're part of our mission to empower creators with the best tools and platform possible.

**Together, we're building the future of the creator economy. Welcome to the team!**

---

## 📄 Legal

By contributing to FANZ, you agree that your contributions will be licensed under the same [MIT License](LICENSE) that covers the project.

---

*Questions about this guide? Let us know in [GitHub Discussions](https://github.com/FanzCEO/FANZ-Unified-Ecosystem/discussions) or reach out to contributors@fanz.network.*