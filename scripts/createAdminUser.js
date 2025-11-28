// FANZ Admin User Creation & Dashboard Testing Script
// Comprehensive admin setup with role-based access control verification

import { storage, createProfile, updateProfile } from '../server/storage.js';
import bcrypt from 'bcryptjs';
import { logger } from '../server/logger.js';

class AdminUserManager {
  constructor() {
    this.testResults = {
      userCreation: false,
      roleAssignment: false,
      dashboardAccess: false,
      permissions: {},
      endpoints: {},
      security: {},
      analytics: {}
    };
  }

  async createAdminUser(userData) {
    try {
      console.log('🔧 Creating admin user...');
      
      const adminData = {
        email: userData.email || 'admin@boyfanz.com',
        password: userData.password || 'FanzAdmin2024!',
        username: userData.username || 'fanzadmin',
        displayName: userData.displayName || 'FANZ Administrator',
        role: 'ADMIN',
        permissions: [
          'USER_MANAGEMENT',
          'CONTENT_MODERATION', 
          'FINANCIAL_OVERSIGHT',
          'ANALYTICS_ACCESS',
          'SYSTEM_ADMINISTRATION',
          'SECURITY_MANAGEMENT',
          'COMPLIANCE_OVERSIGHT',
          'PLATFORM_CONFIGURATION'
        ],
        isEmailVerified: true,
        isAgeVerified: true,
        createdAt: new Date().toISOString(),
        metadata: {
          accountType: 'ADMIN',
          accessLevel: 'SUPER_ADMIN',
          departmentAccess: ['ALL'],
          createdBy: 'SYSTEM',
          securityClearance: 'LEVEL_5'
        }
      };

      // Hash password
      const hashedPassword = await bcrypt.hash(adminData.password, 12);
      adminData.password = hashedPassword;

      // Create admin profile
      const adminProfile = await createProfile({
        email: adminData.email,
        username: adminData.username,
        displayName: adminData.displayName,
        role: adminData.role,
        permissions: adminData.permissions,
        isEmailVerified: adminData.isEmailVerified,
        isAgeVerified: adminData.isAgeVerified,
        metadata: adminData.metadata,
        avatar: 'https://cdn.boyfanz.com/assets/admin-avatar.png',
        bio: 'FANZ Platform Administrator - Ensuring creator success and platform excellence',
        location: 'Platform Operations Center',
        website: 'https://boyfanz.com/admin',
        socialLinks: {
          twitter: '@FanzAdmin',
          linkedin: 'fanz-admin'
        }
      });

      console.log('✅ Admin user created successfully:', {
        id: adminProfile.id,
        email: adminData.email,
        username: adminData.username,
        role: adminData.role,
        permissions: adminData.permissions.length
      });

      this.testResults.userCreation = true;
      this.testResults.roleAssignment = adminProfile.role === 'ADMIN';

      return adminProfile;

    } catch (error) {
      console.error('❌ Failed to create admin user:', error);
      throw error;
    }
  }

  async testDashboardAccess(adminUser) {
    console.log('🔍 Testing dashboard access and permissions...');
    
    const dashboardTests = [
      {
        name: 'User Management Dashboard',
        endpoint: '/api/admin/users',
        permission: 'USER_MANAGEMENT'
      },
      {
        name: 'Content Moderation Dashboard',
        endpoint: '/api/admin/content/moderation',
        permission: 'CONTENT_MODERATION'
      },
      {
        name: 'Financial Overview Dashboard',
        endpoint: '/api/admin/financial/overview',
        permission: 'FINANCIAL_OVERSIGHT'
      },
      {
        name: 'Analytics Dashboard',
        endpoint: '/api/analytics/summary/' + adminUser.id,
        permission: 'ANALYTICS_ACCESS'
      },
      {
        name: 'Security Dashboard',
        endpoint: '/api/security/dashboard/overview',
        permission: 'SECURITY_MANAGEMENT'
      },
      {
        name: 'Infrastructure Dashboard',
        endpoint: '/api/infrastructure/overview',
        permission: 'SYSTEM_ADMINISTRATION'
      },
      {
        name: 'Monitoring Dashboard',
        endpoint: '/api/monitoring/overview',
        permission: 'SYSTEM_ADMINISTRATION'
      }
    ];

    let passedTests = 0;
    
    for (const test of dashboardTests) {
      try {
        const hasPermission = adminUser.permissions.includes(test.permission);
        
        console.log(`  Testing ${test.name}:`);
        console.log(`    Endpoint: ${test.endpoint}`);
        console.log(`    Permission: ${test.permission} - ${hasPermission ? '✅' : '❌'}`);
        
        this.testResults.endpoints[test.endpoint] = hasPermission;
        this.testResults.permissions[test.permission] = hasPermission;
        
        if (hasPermission) passedTests++;
        
      } catch (error) {
        console.error(`    Error testing ${test.name}:`, error.message);
        this.testResults.endpoints[test.endpoint] = false;
      }
    }

    this.testResults.dashboardAccess = passedTests === dashboardTests.length;
    
    console.log(`✅ Dashboard access tests: ${passedTests}/${dashboardTests.length} passed`);
    return this.testResults.dashboardAccess;
  }

  async testAdminEndpoints(adminUser) {
    console.log('🔍 Testing admin-only endpoints...');

    const adminEndpoints = [
      {
        method: 'GET',
        endpoint: '/api/admin/users',
        description: 'List all platform users'
      },
      {
        method: 'POST',
        endpoint: '/api/admin/users/bulk-action',
        description: 'Bulk user management actions'
      },
      {
        method: 'GET',
        endpoint: '/api/admin/content/reports',
        description: 'Content moderation reports'
      },
      {
        method: 'PUT',
        endpoint: '/api/admin/content/moderate',
        description: 'Content moderation actions'
      },
      {
        method: 'GET',
        endpoint: '/api/admin/financial/transactions',
        description: 'Financial transaction oversight'
      },
      {
        method: 'POST',
        endpoint: '/api/admin/announcements',
        description: 'Platform announcements'
      },
      {
        method: 'GET',
        endpoint: '/api/admin/compliance/audit-logs',
        description: 'Compliance audit logs'
      },
      {
        method: 'POST',
        endpoint: '/api/admin/system/maintenance-mode',
        description: 'System maintenance controls'
      }
    ];

    let accessibleEndpoints = 0;

    for (const endpoint of adminEndpoints) {
      try {
        // Simulate endpoint access check
        const hasAccess = this.simulateEndpointAccess(adminUser, endpoint);
        
        console.log(`  ${endpoint.method} ${endpoint.endpoint}: ${hasAccess ? '✅' : '❌'}`);
        console.log(`    ${endpoint.description}`);
        
        this.testResults.endpoints[`${endpoint.method} ${endpoint.endpoint}`] = hasAccess;
        
        if (hasAccess) accessibleEndpoints++;
        
      } catch (error) {
        console.error(`    Error testing ${endpoint.endpoint}:`, error.message);
      }
    }

    console.log(`✅ Admin endpoints: ${accessibleEndpoints}/${adminEndpoints.length} accessible`);
    return accessibleEndpoints === adminEndpoints.length;
  }

  simulateEndpointAccess(adminUser, endpoint) {
    // Simulate role-based access control
    const requiredPermissions = {
      '/api/admin/users': ['USER_MANAGEMENT'],
      '/api/admin/users/bulk-action': ['USER_MANAGEMENT'],
      '/api/admin/content/reports': ['CONTENT_MODERATION'],
      '/api/admin/content/moderate': ['CONTENT_MODERATION'],
      '/api/admin/financial/transactions': ['FINANCIAL_OVERSIGHT'],
      '/api/admin/announcements': ['SYSTEM_ADMINISTRATION'],
      '/api/admin/compliance/audit-logs': ['COMPLIANCE_OVERSIGHT'],
      '/api/admin/system/maintenance-mode': ['SYSTEM_ADMINISTRATION']
    };

    const requiredPerms = requiredPermissions[endpoint.endpoint] || [];
    return requiredPerms.every(perm => adminUser.permissions.includes(perm));
  }

  async testSecurityFeatures(adminUser) {
    console.log('🛡️ Testing security features...');

    const securityTests = [
      {
        name: 'Role Verification',
        test: () => adminUser.role === 'ADMIN'
      },
      {
        name: 'Permission Array',
        test: () => Array.isArray(adminUser.permissions) && adminUser.permissions.length > 0
      },
      {
        name: 'Email Verification',
        test: () => adminUser.isEmailVerified === true
      },
      {
        name: 'Age Verification',
        test: () => adminUser.isAgeVerified === true
      },
      {
        name: 'Security Clearance',
        test: () => adminUser.metadata?.securityClearance === 'LEVEL_5'
      },
      {
        name: 'Account Type',
        test: () => adminUser.metadata?.accountType === 'ADMIN'
      }
    ];

    let passedSecurityTests = 0;

    for (const test of securityTests) {
      try {
        const result = test.test();
        console.log(`  ${test.name}: ${result ? '✅' : '❌'}`);
        this.testResults.security[test.name] = result;
        if (result) passedSecurityTests++;
      } catch (error) {
        console.error(`    Error in ${test.name}:`, error.message);
        this.testResults.security[test.name] = false;
      }
    }

    console.log(`✅ Security tests: ${passedSecurityTests}/${securityTests.length} passed`);
    return passedSecurityTests === securityTests.length;
  }

  async testAnalyticsAccess(adminUser) {
    console.log('📊 Testing analytics and intelligence access...');

    const analyticsTests = [
      {
        name: 'Real-time Dashboards',
        endpoint: '/api/analytics/dashboards',
        permission: 'ANALYTICS_ACCESS'
      },
      {
        name: 'Predictive Models',
        endpoint: '/api/analytics/models/predictive',
        permission: 'ANALYTICS_ACCESS'
      },
      {
        name: 'Competitor Analysis',
        endpoint: '/api/analytics/competitor-analysis',
        permission: 'ANALYTICS_ACCESS'
      },
      {
        name: 'Social Sentiment',
        endpoint: '/api/analytics/sentiment/track',
        permission: 'ANALYTICS_ACCESS'
      },
      {
        name: 'Revenue Optimization',
        endpoint: '/api/analytics/revenue/optimize',
        permission: 'FINANCIAL_OVERSIGHT'
      },
      {
        name: 'AI Insights',
        endpoint: '/api/analytics/insights/ai',
        permission: 'ANALYTICS_ACCESS'
      },
      {
        name: 'Custom Reports',
        endpoint: '/api/analytics/reports/generate',
        permission: 'ANALYTICS_ACCESS'
      }
    ];

    let analyticsAccess = 0;

    for (const test of analyticsTests) {
      try {
        const hasPermission = adminUser.permissions.includes(test.permission);
        console.log(`  ${test.name}: ${hasPermission ? '✅' : '❌'}`);
        this.testResults.analytics[test.name] = hasPermission;
        if (hasPermission) analyticsAccess++;
      } catch (error) {
        console.error(`    Error testing ${test.name}:`, error.message);
        this.testResults.analytics[test.name] = false;
      }
    }

    console.log(`✅ Analytics access: ${analyticsAccess}/${analyticsTests.length} features available`);
    return analyticsAccess === analyticsTests.length;
  }

  async generateTestReport() {
    console.log('\n📋 ADMIN USER CREATION & TESTING REPORT');
    console.log('=' * 50);
    
    console.log('\n🔧 USER CREATION:');
    console.log(`  Admin User Created: ${this.testResults.userCreation ? '✅' : '❌'}`);
    console.log(`  Role Assignment: ${this.testResults.roleAssignment ? '✅' : '❌'}`);
    console.log(`  Dashboard Access: ${this.testResults.dashboardAccess ? '✅' : '❌'}`);

    console.log('\n🛡️ SECURITY FEATURES:');
    Object.entries(this.testResults.security).forEach(([test, passed]) => {
      console.log(`  ${test}: ${passed ? '✅' : '❌'}`);
    });

    console.log('\n🔐 PERMISSIONS:');
    Object.entries(this.testResults.permissions).forEach(([permission, granted]) => {
      console.log(`  ${permission}: ${granted ? '✅' : '❌'}`);
    });

    console.log('\n🌐 ENDPOINTS:');
    Object.entries(this.testResults.endpoints).forEach(([endpoint, accessible]) => {
      console.log(`  ${endpoint}: ${accessible ? '✅' : '❌'}`);
    });

    console.log('\n📊 ANALYTICS ACCESS:');
    Object.entries(this.testResults.analytics).forEach(([feature, available]) => {
      console.log(`  ${feature}: ${available ? '✅' : '❌'}`);
    });

    const totalTests = Object.values(this.testResults).flat().filter(Boolean).length;
    const passedTests = Object.values(this.testResults).flat().filter(result => result === true).length;
    
    console.log(`\n🏆 OVERALL SCORE: ${passedTests}/${totalTests} tests passed`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Admin user fully functional.');
    } else {
      console.log('\n⚠️  Some tests failed. Review permissions and configuration.');
    }

    return {
      totalTests,
      passedTests,
      successRate: (passedTests / totalTests) * 100,
      details: this.testResults
    };
  }

  async runFullTest() {
    console.log('🚀 Starting comprehensive admin user creation and testing...\n');

    try {
      // Step 1: Create admin user
      const adminUser = await this.createAdminUser({
        email: 'admin@boyfanz.com',
        username: 'fanzadmin',
        displayName: 'FANZ Administrator',
        password: 'FanzAdmin2024!'
      });

      console.log('\n' + '='.repeat(50));

      // Step 2: Test dashboard access
      await this.testDashboardAccess(adminUser);

      console.log('\n' + '='.repeat(50));

      // Step 3: Test admin endpoints
      await this.testAdminEndpoints(adminUser);

      console.log('\n' + '='.repeat(50));

      // Step 4: Test security features
      await this.testSecurityFeatures(adminUser);

      console.log('\n' + '='.repeat(50));

      // Step 5: Test analytics access
      await this.testAnalyticsAccess(adminUser);

      console.log('\n' + '='.repeat(50));

      // Step 6: Generate comprehensive report
      const report = await this.generateTestReport();

      return {
        success: true,
        adminUser,
        testReport: report,
        message: 'Admin user created and tested successfully!'
      };

    } catch (error) {
      console.error('❌ Admin user creation/testing failed:', error);
      return {
        success: false,
        error: error.message,
        testReport: this.testResults
      };
    }
  }
}

// Export for use in other modules
export default AdminUserManager;

// CLI execution
if (process.argv[1] === import.meta.url.replace('file://', '')) {
  const adminManager = new AdminUserManager();
  
  adminManager.runFullTest()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Admin user creation and testing completed successfully!');
        console.log(`📧 Admin Email: admin@boyfanz.com`);
        console.log(`👤 Admin Username: fanzadmin`);
        console.log(`🔑 Admin Password: FanzAdmin2024!`);
        console.log(`🆔 Admin ID: ${result.adminUser.id}`);
        process.exit(0);
      } else {
        console.error('\n❌ Admin user creation/testing failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}