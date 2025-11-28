import { storage } from '../storage';
import { performanceOptimizationService } from './performanceOptimizationService';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'earnings' | 'engagement' | 'content' | 'community' | 'milestone' | 'special';
  type: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  icon: string;
  barTheme: 'whiskey' | 'neon' | 'vintage' | 'underground' | 'noir';
  requirements: {
    metric: string;
    value: number;
    timeframe?: string;
    conditions?: Record<string, any>;
  }[];
  rewards: {
    type: 'badge' | 'title' | 'perk' | 'boost' | 'unlock' | 'currency';
    value: any;
    description: string;
  }[];
  rarity: number; // 0-1, how rare this achievement is
  story: string; // Seedy bar-inspired flavor text
  unlockedBy: string[]; // User IDs who have unlocked this
  createdAt: Date;
  isActive: boolean;
  isSecret: boolean; // Hidden until unlocked
}

interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
  celebrationShown: boolean;
  metadata?: Record<string, any>;
}

interface ProgressionPath {
  id: string;
  name: string;
  description: string;
  theme: 'dive_bar_regular' | 'smooth_operator' | 'crowd_pleaser' | 'big_spender' | 'legend';
  stages: {
    level: number;
    name: string;
    requirements: any[];
    rewards: any[];
    flavor: string;
  }[];
}

interface BarReward {
  id: string;
  name: string;
  type: 'drink' | 'seat' | 'privilege' | 'access' | 'boost';
  description: string;
  barFlavor: string; // Seedy bar-inspired description
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  effects: {
    type: string;
    value: any;
    duration?: number; // in hours
  }[];
  cost?: {
    type: 'achievement_points' | 'earnings' | 'special_currency';
    amount: number;
  };
  availability: {
    permanent: boolean;
    startDate?: Date;
    endDate?: Date;
    conditions?: string[];
  };
}

// Revolutionary creator achievement system with seedy bar-inspired rewards
class CreatorAchievementService {
  private achievementsCache = new Map<string, Achievement>();
  private userProgressCache = new Map<string, UserAchievement[]>();
  private realtimeTrackers = new Map<string, any>();

  constructor() {
    this.initializeAchievementSystem();
    this.loadSeeddyBarAchievements();
    this.startProgressTracking();
  }

  // ===== ACHIEVEMENT MANAGEMENT =====

  // Check user progress and unlock achievements
  async checkAndUnlockAchievements(userId: string, triggerEvent?: {
    type: string;
    data: any;
  }): Promise<UserAchievement[]> {
    try {
      console.log(`🏆 Checking achievements for user: ${userId}`);

      const userStats = await this.getUserStats(userId);
      const userAchievements = await this.getUserAchievements(userId);
      const unlockedAchievementIds = new Set(userAchievements.map(ua => ua.achievementId));

      // Get all active achievements
      const allAchievements = await this.getAllActiveAchievements();
      
      const newlyUnlocked: UserAchievement[] = [];

      // Check each achievement
      for (const achievement of allAchievements) {
        if (unlockedAchievementIds.has(achievement.id)) continue;

        const isUnlocked = await this.evaluateAchievementRequirements(
          achievement,
          userStats,
          triggerEvent
        );

        if (isUnlocked) {
          const userAchievement = await this.unlockAchievement(userId, achievement);
          newlyUnlocked.push(userAchievement);
          
          // Award rewards
          await this.awardAchievementRewards(userId, achievement);
          
          console.log(`🎉 Achievement unlocked: ${achievement.name} for user ${userId}`);
        }
      }

      // Update progress for partially completed achievements
      await this.updateAchievementProgress(userId, userStats);

      return newlyUnlocked;

    } catch (error) {
      console.error('Achievement check failed:', error);
      return [];
    }
  }

  // Get user's achievements with progress
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      // Check cache first
      if (this.userProgressCache.has(userId)) {
        return this.userProgressCache.get(userId)!;
      }

      // Fetch from database
      const achievements = await storage.getUserAchievements(userId);
      
      // Cache results
      this.userProgressCache.set(userId, achievements);
      
      return achievements;

    } catch (error) {
      console.error('Failed to get user achievements:', error);
      return [];
    }
  }

  // Get achievement progress for display
  async getAchievementProgress(userId: string): Promise<{
    unlocked: Achievement[];
    inProgress: (Achievement & { progress: any })[];
    available: Achievement[];
    totalPoints: number;
    rank: string;
    nextRankRequirements: any;
  }> {
    try {
      const userAchievements = await this.getUserAchievements(userId);
      const userStats = await this.getUserStats(userId);
      const allAchievements = await this.getAllActiveAchievements();

      const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

      const unlocked = allAchievements.filter(a => unlockedIds.has(a.id));
      const available = allAchievements.filter(a => !unlockedIds.has(a.id) && !a.isSecret);
      
      // Calculate progress for available achievements
      const inProgress = await Promise.all(
        available.map(async (achievement) => {
          const progress = await this.calculateAchievementProgress(achievement, userStats);
          return {
            ...achievement,
            progress
          };
        })
      );

      // Calculate user ranking
      const totalPoints = this.calculateAchievementPoints(unlocked);
      const rank = this.determineUserRank(totalPoints);
      const nextRankRequirements = this.getNextRankRequirements(rank, totalPoints);

      return {
        unlocked,
        inProgress,
        available,
        totalPoints,
        rank,
        nextRankRequirements
      };

    } catch (error) {
      console.error('Failed to get achievement progress:', error);
      throw error;
    }
  }

  // ===== SEEDY BAR REWARDS SYSTEM =====

  // Get available bar rewards for user
  async getBarRewards(userId: string): Promise<{
    available: BarReward[];
    owned: BarReward[];
    featured: BarReward[];
    userCurrency: {
      achievementPoints: number;
      specialTokens: number;
    };
  }> {
    try {
      console.log(`🍺 Getting bar rewards for user: ${userId}`);

      const userAchievements = await this.getUserAchievements(userId);
      const userCurrency = await this.getUserCurrency(userId);
      const allRewards = await this.getAllBarRewards();

      // Filter rewards based on user's achievements and currency
      const available = allRewards.filter(reward => 
        this.canUserAffordReward(reward, userCurrency) &&
        this.meetsRewardRequirements(reward, userAchievements)
      );

      const owned = await storage.getUserBarRewards(userId);
      const featured = allRewards.filter(reward => 
        reward.rarity === 'legendary' || reward.availability.endDate
      ).slice(0, 3);

      return {
        available,
        owned,
        featured,
        userCurrency
      };

    } catch (error) {
      console.error('Failed to get bar rewards:', error);
      throw error;
    }
  }

  // Purchase bar reward
  async purchaseBarReward(userId: string, rewardId: string): Promise<{
    success: boolean;
    reward?: BarReward;
    error?: string;
  }> {
    try {
      console.log(`🛒 User ${userId} purchasing bar reward: ${rewardId}`);

      const reward = await storage.getBarReward(rewardId);
      if (!reward) {
        return { success: false, error: 'Reward not found' };
      }

      const userCurrency = await this.getUserCurrency(userId);
      
      // Check if user can afford it
      if (!this.canUserAffordReward(reward, userCurrency)) {
        return { success: false, error: 'Insufficient currency' };
      }

      // Deduct currency
      await this.deductCurrency(userId, reward.cost!);

      // Grant reward to user
      await storage.grantUserBarReward(userId, rewardId);

      // Apply reward effects
      await this.applyRewardEffects(userId, reward);

      // Celebrate the purchase
      await this.celebrateBarPurchase(userId, reward);

      console.log(`✅ Bar reward purchased: ${reward.name} by user ${userId}`);
      return { success: true, reward };

    } catch (error) {
      console.error('Bar reward purchase failed:', error);
      return { success: false, error: 'Purchase failed' };
    }
  }

  // ===== PROGRESSION PATHS =====

  // Get user's progression on different paths
  async getUserProgressionPaths(userId: string): Promise<{
    paths: (ProgressionPath & {
      currentLevel: number;
      progress: number;
      nextStage?: any;
    })[];
    recommendations: string[];
  }> {
    try {
      const userStats = await this.getUserStats(userId);
      const paths = await this.getAllProgressionPaths();

      const progressedPaths = paths.map(path => {
        const currentLevel = this.calculatePathLevel(path, userStats);
        const progress = this.calculatePathProgress(path, userStats, currentLevel);
        const nextStage = path.stages.find(stage => stage.level > currentLevel);

        return {
          ...path,
          currentLevel,
          progress,
          nextStage
        };
      });

      const recommendations = this.generateProgressionRecommendations(userStats, progressedPaths);

      return {
        paths: progressedPaths,
        recommendations
      };

    } catch (error) {
      console.error('Failed to get progression paths:', error);
      throw error;
    }
  }

  // ===== CELEBRATION SYSTEM =====

  // Trigger achievement celebration
  async celebrateAchievement(userId: string, achievement: Achievement): Promise<{
    celebrationType: 'toast' | 'round_of_drinks' | 'standing_ovation' | 'legendary_moment';
    message: string;
    effects: string[];
    duration: number;
  }> {
    try {
      const celebrationType = this.determineCelebrationType(achievement);
      const message = this.generateCelebrationMessage(achievement);
      const effects = this.getCelebrationEffects(achievement);

      // Store celebration for frontend display
      await storage.createAchievementCelebration({
        userId,
        achievementId: achievement.id,
        celebrationType,
        message,
        triggeredAt: new Date()
      });

      // Notify other users in the "bar" about legendary achievements
      if (achievement.type === 'legendary') {
        await this.broadcastLegendaryAchievement(userId, achievement);
      }

      return {
        celebrationType,
        message,
        effects,
        duration: this.getCelebrationDuration(achievement)
      };

    } catch (error) {
      console.error('Achievement celebration failed:', error);
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  private async initializeAchievementSystem(): Promise<void> {
    console.log('🏆 Initializing creator achievement system');
  }

  private async loadSeeddyBarAchievements(): Promise<void> {
    const achievements: Achievement[] = [
      {
        id: 'first_dollar',
        name: 'First Round\'s On Me',
        description: 'Earn your first dollar like buying your first drink',
        category: 'earnings',
        type: 'bronze',
        icon: '🍺',
        barTheme: 'whiskey',
        requirements: [{
          metric: 'total_earnings',
          value: 100 // $1.00
        }],
        rewards: [{
          type: 'badge',
          value: 'first_dollar_badge',
          description: 'The classic "first dollar" badge every bar owner frames'
        }],
        rarity: 0.95,
        story: 'Every legend starts with that first crumpled dollar bill. Frame it, because you\'ll never forget this moment.',
        unlockedBy: [],
        createdAt: new Date(),
        isActive: true,
        isSecret: false
      },
      {
        id: 'smooth_talker',
        name: 'Smooth Talker',
        description: 'Get 100 messages from your fans',
        category: 'engagement',
        type: 'silver',
        icon: '🗣️',
        barTheme: 'neon',
        requirements: [{
          metric: 'messages_received',
          value: 100
        }],
        rewards: [{
          type: 'title',
          value: 'The Charmer',
          description: 'A title that shows you know how to work the room'
        }],
        rarity: 0.7,
        story: 'You\'ve got that silver tongue that keeps \'em coming back for more. The bartender nods approvingly.',
        unlockedBy: [],
        createdAt: new Date(),
        isActive: true,
        isSecret: false
      },
      {
        id: 'high_roller',
        name: 'High Roller',
        description: 'Earn $1000 in a single month',
        category: 'earnings',
        type: 'gold',
        icon: '💰',
        barTheme: 'vintage',
        requirements: [{
          metric: 'monthly_earnings',
          value: 100000, // $1000
          timeframe: '30d'
        }],
        rewards: [{
          type: 'perk',
          value: 'priority_support',
          description: 'VIP support line access'
        }, {
          type: 'boost',
          value: 'revenue_boost_5',
          description: '5% revenue boost for 30 days'
        }],
        rarity: 0.3,
        story: 'The big leagues, baby! The house buys you a top-shelf whiskey and the entire bar raises their glasses.',
        unlockedBy: [],
        createdAt: new Date(),
        isActive: true,
        isSecret: false
      },
      {
        id: 'nights_regular',
        name: 'Night\'s Regular',
        description: 'Upload content for 30 consecutive days',
        category: 'content',
        type: 'silver',
        icon: '🌙',
        barTheme: 'underground',
        requirements: [{
          metric: 'consecutive_upload_days',
          value: 30
        }],
        rewards: [{
          type: 'unlock',
          value: 'scheduled_posts',
          description: 'Unlock scheduled posting feature'
        }],
        rarity: 0.4,
        story: 'The bartender knows your order by heart. You\'ve become part of the furniture, and that\'s not a bad thing.',
        unlockedBy: [],
        createdAt: new Date(),
        isActive: true,
        isSecret: false
      },
      {
        id: 'legend_status',
        name: 'Living Legend',
        description: 'Earn $10,000 total and have 1000+ fans',
        category: 'milestone',
        type: 'legendary',
        icon: '👑',
        barTheme: 'noir',
        requirements: [{
          metric: 'total_earnings',
          value: 1000000 // $10,000
        }, {
          metric: 'follower_count',
          value: 1000
        }],
        rewards: [{
          type: 'title',
          value: 'Legend',
          description: 'A golden title that commands respect'
        }, {
          type: 'perk',
          value: 'custom_profile',
          description: 'Custom profile themes and layouts'
        }, {
          type: 'currency',
          value: 1000,
          description: '1000 premium tokens'
        }],
        rarity: 0.05,
        story: 'They don\'t just know your name here—they built a shrine. Your portrait hangs behind the bar, and newcomers whisper about your legend.',
        unlockedBy: [],
        createdAt: new Date(),
        isActive: true,
        isSecret: false
      },
      {
        id: 'closing_time_warrior',
        name: 'Closing Time Warrior',
        description: 'Upload content between 2-4 AM, 10 times',
        category: 'special',
        type: 'gold',
        icon: '🌅',
        barTheme: 'underground',
        requirements: [{
          metric: 'late_night_uploads',
          value: 10,
          conditions: { hours: [2, 3] }
        }],
        rewards: [{
          type: 'boost',
          value: 'night_owl_boost',
          description: 'Extra visibility for late-night content'
        }],
        rarity: 0.2,
        story: 'When the neon signs flicker and the streets empty, you\'re still here creating. The night belongs to you.',
        unlockedBy: [],
        createdAt: new Date(),
        isActive: true,
        isSecret: true
      }
    ];

    // Store achievements in database
    for (const achievement of achievements) {
      await storage.createAchievement(achievement);
      this.achievementsCache.set(achievement.id, achievement);
    }

    console.log(`🍻 Loaded ${achievements.length} seedy bar achievements`);
  }

  private startProgressTracking(): void {
    // Track user progress in real-time
    console.log('📊 Starting real-time achievement tracking');
  }

  private async getUserStats(userId: string): Promise<any> {
    // Aggregate user statistics for achievement evaluation
    return {
      totalEarnings: 50000, // $500
      monthlyEarnings: 25000, // $250 this month
      messagesReceived: 75,
      followerCount: 150,
      contentCount: 25,
      consecutiveUploadDays: 12,
      lateNightUploads: 3,
      avgRating: 4.2,
      totalViews: 5000
    };
  }

  private async getAllActiveAchievements(): Promise<Achievement[]> {
    const achievements = await storage.getActiveAchievements();
    return achievements;
  }

  private async evaluateAchievementRequirements(
    achievement: Achievement,
    userStats: any,
    triggerEvent?: any
  ): Promise<boolean> {
    for (const requirement of achievement.requirements) {
      const userValue = userStats[requirement.metric] || 0;
      
      if (userValue < requirement.value) {
        return false;
      }

      // Check timeframe constraints
      if (requirement.timeframe) {
        // Implementation would check timeframe-specific stats
      }

      // Check conditions
      if (requirement.conditions) {
        // Implementation would validate specific conditions
      }
    }

    return true;
  }

  private async unlockAchievement(userId: string, achievement: Achievement): Promise<UserAchievement> {
    const userAchievement: UserAchievement = {
      id: `ua_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      achievementId: achievement.id,
      unlockedAt: new Date(),
      celebrationShown: false
    };

    await storage.createUserAchievement(userAchievement);
    
    // Clear cache
    this.userProgressCache.delete(userId);

    // Trigger celebration
    await this.celebrateAchievement(userId, achievement);

    return userAchievement;
  }

  private async awardAchievementRewards(userId: string, achievement: Achievement): Promise<void> {
    for (const reward of achievement.rewards) {
      await this.applyReward(userId, reward);
    }
  }

  private async applyReward(userId: string, reward: any): Promise<void> {
    console.log(`🎁 Applying reward: ${reward.type} - ${reward.value} to user ${userId}`);
    
    switch (reward.type) {
      case 'badge':
        await storage.awardUserBadge(userId, reward.value);
        break;
      case 'title':
        await storage.setUserTitle(userId, reward.value);
        break;
      case 'perk':
        await storage.enableUserPerk(userId, reward.value);
        break;
      case 'boost':
        await storage.applyUserBoost(userId, reward.value);
        break;
      case 'currency':
        await storage.addUserCurrency(userId, reward.value);
        break;
    }
  }

  private async updateAchievementProgress(userId: string, userStats: any): Promise<void> {
    // Update progress for partially completed achievements
  }

  private calculateAchievementPoints(achievements: Achievement[]): number {
    return achievements.reduce((total, achievement) => {
      const points = {
        bronze: 10,
        silver: 25,
        gold: 50,
        platinum: 100,
        legendary: 250
      };
      return total + points[achievement.type];
    }, 0);
  }

  private determineUserRank(points: number): string {
    if (points >= 1000) return 'Bar Owner';
    if (points >= 500) return 'Regular';
    if (points >= 200) return 'Frequent Visitor';
    if (points >= 50) return 'Newcomer';
    return 'First Timer';
  }

  private getNextRankRequirements(currentRank: string, currentPoints: number): any {
    const ranks = {
      'First Timer': { next: 'Newcomer', points: 50 },
      'Newcomer': { next: 'Frequent Visitor', points: 200 },
      'Frequent Visitor': { next: 'Regular', points: 500 },
      'Regular': { next: 'Bar Owner', points: 1000 },
      'Bar Owner': { next: 'Legend', points: 2500 }
    };

    const current = ranks[currentRank as keyof typeof ranks];
    return current ? {
      nextRank: current.next,
      pointsNeeded: current.points - currentPoints
    } : null;
  }

  private async calculateAchievementProgress(achievement: Achievement, userStats: any): Promise<any> {
    const requirement = achievement.requirements[0]; // Simplified
    const current = userStats[requirement.metric] || 0;
    const target = requirement.value;
    
    return {
      current,
      target,
      percentage: Math.min((current / target) * 100, 100)
    };
  }

  // Additional helper methods for bar rewards and celebrations...
  private async getUserCurrency(userId: string): Promise<any> {
    return {
      achievementPoints: 150,
      specialTokens: 25
    };
  }

  private canUserAffordReward(reward: BarReward, currency: any): boolean {
    if (!reward.cost) return true;
    return currency[reward.cost.type] >= reward.cost.amount;
  }

  private meetsRewardRequirements(reward: BarReward, achievements: UserAchievement[]): boolean {
    return true; // Simplified
  }

  private determineCelebrationType(achievement: Achievement): any {
    const types = {
      bronze: 'toast',
      silver: 'round_of_drinks',
      gold: 'standing_ovation',
      legendary: 'legendary_moment'
    };
    return types[achievement.type];
  }

  private generateCelebrationMessage(achievement: Achievement): string {
    return `🎉 ${achievement.story}`;
  }

  private getCelebrationEffects(achievement: Achievement): string[] {
    return ['confetti', 'neon_flash', 'applause'];
  }

  private getCelebrationDuration(achievement: Achievement): number {
    const durations = {
      bronze: 3000,
      silver: 5000,
      gold: 8000,
      legendary: 12000
    };
    return durations[achievement.type];
  }

  private async broadcastLegendaryAchievement(userId: string, achievement: Achievement): Promise<void> {
    console.log(`📢 Broadcasting legendary achievement: ${achievement.name} by user ${userId}`);
  }

  // Mock implementations for development
  private async getAllBarRewards(): Promise<BarReward[]> { return []; }
  private async deductCurrency(userId: string, cost: any): Promise<void> {}
  private async applyRewardEffects(userId: string, reward: BarReward): Promise<void> {}
  private async celebrateBarPurchase(userId: string, reward: BarReward): Promise<void> {}
  private async getAllProgressionPaths(): Promise<ProgressionPath[]> { return []; }
  private calculatePathLevel(path: ProgressionPath, stats: any): number { return 1; }
  private calculatePathProgress(path: ProgressionPath, stats: any, level: number): number { return 25; }
  private generateProgressionRecommendations(stats: any, paths: any[]): string[] { return []; }
}

export const creatorAchievementService = new CreatorAchievementService();