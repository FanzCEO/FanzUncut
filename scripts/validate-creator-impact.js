#!/usr/bin/env node

/**
 * FANZ Creator-First Impact Validator
 * 
 * Validates that code changes align with FANZ's creator-first principles:
 * - Increases creator autonomy
 * - Boosts creator income
 * - Enhances creator safety
 * - Improves fan experience
 */

const fs = require('fs');
const path = require('path');

const CREATOR_IMPACT_KEYWORDS = {
  autonomy: [
    'creator control', 'creator ownership', 'creator choice', 'creator settings',
    'privacy controls', 'content control', 'creator dashboard', 'creator tools'
  ],
  income: [
    'monetization', 'earnings', 'revenue', 'payment', 'payout', 'subscription',
    'tips', 'commission', 'billing', 'pricing', 'sales'
  ],
  safety: [
    'security', 'privacy', 'protection', 'verification', 'authentication',
    'encryption', 'safety', 'moderation', 'reporting', 'blocking'
  ],
  experience: [
    'user experience', 'ux', 'ui', 'interface', 'usability', 'accessibility',
    'performance', 'speed', 'responsive', 'mobile'
  ]
};

const CREATOR_NEGATIVE_PATTERNS = [
  'hidden fee', 'forced', 'mandatory', 'required payment', 'locked feature',
  'revenue share reduction', 'commission increase', 'data collection',
  'third party sharing', 'advertising tracking'
];

class CreatorImpactValidator {
  constructor() {
    this.results = {
      score: 0,
      impacts: [],
      warnings: [],
      recommendations: []
    };
  }

  validateCommitMessages() {
    try {
      const { execSync } = require('child_process');
      const commits = execSync('git log --oneline -10', { encoding: 'utf8' })
        .split('\n')
        .filter(line => line.trim());

      for (const commit of commits) {
        this.analyzeText(commit, 'commit');
      }
    } catch (error) {
      console.warn('Could not analyze commit messages:', error.message);
    }
  }

  validateChangedFiles() {
    try {
      const { execSync } = require('child_process');
      const files = execSync('git diff --name-only HEAD~1 2>/dev/null || echo ""', { encoding: 'utf8' })
        .split('\n')
        .filter(f => f.trim() && (f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.md')));

      for (const file of files) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          this.analyzeText(content, `file:${file}`);
        }
      }
    } catch (error) {
      console.warn('Could not analyze changed files:', error.message);
    }
  }

  analyzeText(text, source) {
    const lowerText = text.toLowerCase();
    
    // Check for creator-positive impacts
    Object.entries(CREATOR_IMPACT_KEYWORDS).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (lowerText.includes(keyword)) {
          this.results.impacts.push({
            category,
            keyword,
            source,
            type: 'positive'
          });
          this.results.score += 1;
        }
      });
    });

    // Check for potential negative patterns
    CREATOR_NEGATIVE_PATTERNS.forEach(pattern => {
      if (lowerText.includes(pattern)) {
        this.results.warnings.push({
          pattern,
          source,
          message: `Potential creator-negative pattern detected: "${pattern}"`
        });
        this.results.score -= 2;
      }
    });
  }

  validatePackageChanges() {
    const packagePath = 'package.json';
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check for creator-focused dependencies
      const creatorDeps = [
        'stripe', 'paypal', '@uppy', 'sharp', 'multer', // Payment & media
        'helmet', 'bcrypt', 'argon2', 'passport', // Security  
        'react', 'next', 'tailwind', // Modern UX
        '@radix-ui', 'framer-motion', 'lucide-react' // Accessible UI
      ];

      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      creatorDeps.forEach(dep => {
        if (Object.keys(allDeps).some(d => d.includes(dep))) {
          this.results.impacts.push({
            category: 'tooling',
            keyword: dep,
            source: 'package.json',
            type: 'positive'
          });
          this.results.score += 0.5;
        }
      });
    }
  }

  generateReport() {
    console.log('\n🎯 FANZ Creator-First Impact Validation Report');
    console.log('='.repeat(50));
    
    console.log(`\n📊 Overall Impact Score: ${this.results.score}`);
    
    if (this.results.score >= 5) {
      console.log('✅ EXCELLENT creator-first impact!');
    } else if (this.results.score >= 2) {
      console.log('✅ Good creator-first alignment');  
    } else if (this.results.score >= 0) {
      console.log('⚠️  Moderate creator impact - consider improvements');
    } else {
      console.log('❌ Low creator-first impact - review needed');
    }

    // Positive Impacts
    if (this.results.impacts.length > 0) {
      console.log('\n✅ Creator-First Impacts Detected:');
      const groupedImpacts = {};
      this.results.impacts.forEach(impact => {
        if (!groupedImpacts[impact.category]) {
          groupedImpacts[impact.category] = [];
        }
        groupedImpacts[impact.category].push(impact.keyword);
      });

      Object.entries(groupedImpacts).forEach(([category, keywords]) => {
        console.log(`   ${category}: ${[...new Set(keywords)].join(', ')}`);
      });
    }

    // Warnings
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  Potential Creator-Negative Patterns:');
      this.results.warnings.forEach(warning => {
        console.log(`   - ${warning.message} (${warning.source})`);
      });
    }

    // Recommendations
    this.generateRecommendations();
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }

    return this.results.score >= 0; // Pass if non-negative score
  }

  generateRecommendations() {
    const categories = new Set(this.results.impacts.map(i => i.category));
    
    if (!categories.has('income')) {
      this.results.recommendations.push(
        'Consider how this change could help creators earn more'
      );
    }
    
    if (!categories.has('safety')) {
      this.results.recommendations.push(
        'Ensure security and privacy measures are maintained/improved'
      );
    }
    
    if (!categories.has('autonomy')) {
      this.results.recommendations.push(
        'Consider adding creator control options or settings'
      );
    }

    if (this.results.warnings.length > 0) {
      this.results.recommendations.push(
        'Review flagged patterns to ensure they align with creator-first principles'
      );
    }
  }

  run() {
    console.log('🔍 Validating creator-first impact...\n');
    
    this.validateCommitMessages();
    this.validateChangedFiles();
    this.validatePackageChanges();
    
    const passed = this.generateReport();
    
    // Exit with appropriate code
    process.exit(passed ? 0 : 1);
  }
}

// Run if called directly
if (require.main === module) {
  new CreatorImpactValidator().run();
}

module.exports = CreatorImpactValidator;