// FANZ Fan Engagement Tools Service
// Manages fan levels, badges, exclusive access, custom tip messages, and personalization

class FanEngagementToolsService {
  constructor() {
    // In-memory stores (swap for DB in production)
    this.levelConfigs = new Map(); // key: creatorId -> { levels: [...], rules }
    this.badges = new Map();       // key: creatorId -> Map(fanId -> Set(badges))
    this.badgeDesigns = new Map(); // key: creatorId -> Array({ name, icon, description })
    this.exclusiveAccess = new Map(); // key: creatorId -> Map(fanId -> Set(contentTier))
    this.greetings = new Map();    // key: creatorId -> Map(fanId -> message)
    this.tipMessageRules = new Map(); // key: creatorId -> { enabled, maxLength, moderationRequired }
    this.auditLog = new Map();     // key: creatorId -> Array(events)
  }

  log(creatorId, event) {
    const arr = this.auditLog.get(creatorId) || [];
    arr.push({ ...event, at: new Date().toISOString() });
    this.auditLog.set(creatorId, arr);
  }

  // === Levels ===
  async configureLevels(creatorId, config) {
    const levels = config?.levels || [];
    if (!Array.isArray(levels) || levels.length === 0) {
      throw new Error('Levels array required');
    }
    // Basic validation
    for (const lvl of levels) {
      if (typeof lvl.id !== 'number' || !lvl.name) throw new Error('Invalid level definition');
      if (!lvl.requirements || typeof lvl.requirements.totalSpent !== 'number') throw new Error('Level requirements missing');
    }
    this.levelConfigs.set(creatorId, { levels, rules: config.rules || {} });
    this.log(creatorId, { type: 'LEVELS_CONFIGURED', count: levels.length });
    return this.levelConfigs.get(creatorId);
  }

  // === Badges ===
  async setBadgeDesigns(creatorId, designs) {
    if (!Array.isArray(designs)) throw new Error('Designs must be an array');
    this.badgeDesigns.set(creatorId, designs);
    this.log(creatorId, { type: 'BADGE_DESIGNS_SET', count: designs.length });
    return designs;
  }

  async assignBadge(creatorId, fanId, badgeName) {
    const designs = this.badgeDesigns.get(creatorId) || [];
    if (!designs.find(b => b.name === badgeName)) throw new Error('Unknown badge');
    const map = this.badges.get(creatorId) || new Map();
    const set = map.get(fanId) || new Set();
    set.add(badgeName);
    map.set(fanId, set);
    this.badges.set(creatorId, map);
    this.log(creatorId, { type: 'BADGE_ASSIGNED', fanId, badgeName });
    return Array.from(set);
  }

  async getBadges(creatorId, fanId) {
    const map = this.badges.get(creatorId) || new Map();
    return Array.from(map.get(fanId) || []);
  }

  // === Exclusive Content Access ===
  async grantExclusiveAccess(creatorId, fanId, tier) {
    if (!tier) throw new Error('Tier required');
    const map = this.exclusiveAccess.get(creatorId) || new Map();
    const set = map.get(fanId) || new Set();
    set.add(tier);
    map.set(fanId, set);
    this.exclusiveAccess.set(creatorId, map);
    this.log(creatorId, { type: 'EXCLUSIVE_GRANTED', fanId, tier });
    return Array.from(set);
  }

  async getExclusiveAccess(creatorId, fanId) {
    const map = this.exclusiveAccess.get(creatorId) || new Map();
    return Array.from(map.get(fanId) || []);
  }

  // === Personalized Greetings ===
  async setPersonalizedGreeting(creatorId, fanId, message) {
    if (!message || message.length > 300) throw new Error('Message required and must be <= 300 chars');
    const map = this.greetings.get(creatorId) || new Map();
    map.set(fanId, message);
    this.greetings.set(creatorId, map);
    this.log(creatorId, { type: 'GREETING_SET', fanId });
    return { fanId, message };
  }

  async getPersonalizedGreeting(creatorId, fanId) {
    const map = this.greetings.get(creatorId) || new Map();
    return map.get(fanId) || null;
  }

  // === Custom Tip Messages ===
  async configureTipMessages(creatorId, config) {
    const cfg = {
      enabled: !!config?.enabled,
      maxLength: typeof config?.maxLength === 'number' ? config.maxLength : 300,
      moderationRequired: !!config?.moderationRequired
    };
    this.tipMessageRules.set(creatorId, cfg);
    this.log(creatorId, { type: 'TIP_MESSAGES_CONFIG', enabled: cfg.enabled });
    return cfg;
  }

  async processCustomTipMessage(creatorId, fanId, message) {
    const rules = this.tipMessageRules.get(creatorId) || { enabled: false, maxLength: 300, moderationRequired: false };
    if (!rules.enabled) throw new Error('Tip messages disabled');
    if (!message || message.length > rules.maxLength) throw new Error('Invalid message');
    // Simple moderation placeholder
    const banned = [/http:\/\//i, /https:\/\//i];
    if (banned.some((r) => r.test(message))) throw new Error('Links not allowed');
    this.log(creatorId, { type: 'TIP_MESSAGE_RECEIVED', fanId, length: message.length, moderated: rules.moderationRequired });
    return { accepted: true, moderated: rules.moderationRequired };
  }

  // === Engagement Profile ===
  async getEngagementProfile(creatorId, fanId) {
    return {
      fanId,
      badges: await this.getBadges(creatorId, fanId),
      exclusiveAccess: await this.getExclusiveAccess(creatorId, fanId),
      greeting: await this.getPersonalizedGreeting(creatorId, fanId)
    };
  }
}

export default FanEngagementToolsService;
