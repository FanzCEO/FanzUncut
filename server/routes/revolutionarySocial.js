// FANZ Revolutionary Social Features API Routes
// Comprehensive social endpoints for meetups, collaborations, events, gaming, communities

import express from 'express';
import RevolutionarySocialEngine from '../services/revolutionarySocialEngine.js';

const router = express.Router();
const socialEngine = new RevolutionarySocialEngine();

// === SOCIAL MEETUPS ===

// Create a new social meetup
router.post('/meetups', async (req, res) => {
  try {
    const creatorId = req.user?.id || req.body.creatorId;
    const meetupData = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type || 'CREATOR_MEETUP',
      format: req.body.format || 'HYBRID',
      capacity: req.body.capacity || 50,
      location: req.body.location || {},
      scheduledDate: req.body.scheduledDate,
      duration: req.body.duration || 120,
      price: req.body.price || 0,
      currency: req.body.currency || 'USD',
      categories: req.body.categories || [],
      tags: req.body.tags || [],
      ageRestriction: req.body.ageRestriction || 18,
      isPrivate: req.body.isPrivate || false,
      requiresApproval: req.body.requiresApproval || false
    };

    const meetup = await socialEngine.createSocialMeetup(creatorId, meetupData);
    
    res.status(201).json({
      success: true,
      message: 'Social meetup created successfully',
      meetup,
      details: {
        meetupId: meetup.id,
        type: meetup.type,
        format: meetup.format,
        scheduledDate: meetup.scheduledDate,
        capacity: meetup.capacity,
        virtualRoom: meetup.virtualRoom?.url,
        activities: meetup.activities.length
      }
    });
  } catch (error) {
    console.error('Meetup creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create social meetup',
      error: error.message
    });
  }
});

// Get meetup details
router.get('/meetups/:meetupId', async (req, res) => {
  try {
    const { meetupId } = req.params;
    const meetup = socialEngine.socialMeetups.get(meetupId);
    
    if (!meetup) {
      return res.status(404).json({
        success: false,
        message: 'Meetup not found'
      });
    }

    res.json({
      success: true,
      meetup,
      metadata: {
        currentAttendees: meetup.attendees.length,
        spotsRemaining: meetup.capacity - meetup.attendees.length,
        status: meetup.status
      }
    });
  } catch (error) {
    console.error('Meetup fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meetup details',
      error: error.message
    });
  }
});

// === INFLUENCER COLLABORATIONS ===

// Create a new collaboration
router.post('/collaborations', async (req, res) => {
  try {
    const initiatorId = req.user?.id || req.body.initiatorId;
    const collaborationData = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type || 'CONTENT_COLLABORATION',
      scope: req.body.scope,
      deliverables: req.body.deliverables || [],
      timeline: req.body.timeline,
      budget: req.body.budget || 0,
      revenueShare: req.body.revenueShare || 'EQUAL_SPLIT',
      contractTerms: req.body.contractTerms || {},
      requirements: req.body.requirements || [],
      invitedCollaborators: req.body.invitedCollaborators || [],
      category: req.body.category || 'GENERAL'
    };

    const collaboration = await socialEngine.createInfluencerCollaboration(initiatorId, collaborationData);
    
    res.status(201).json({
      success: true,
      message: 'Influencer collaboration created successfully',
      collaboration,
      details: {
        collaborationId: collaboration.id,
        type: collaboration.type,
        budget: collaboration.budget,
        milestones: collaboration.milestones.length,
        invitesSent: collaboration.invitedCollaborators.length
      }
    });
  } catch (error) {
    console.error('Collaboration creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create collaboration',
      error: error.message
    });
  }
});

// Get collaboration details
router.get('/collaborations/:collaborationId', async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const collaboration = socialEngine.influencerCollaborations.get(collaborationId);
    
    if (!collaboration) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration not found'
      });
    }

    res.json({
      success: true,
      collaboration,
      progress: {
        collaborators: collaboration.collaborators.length,
        milestonesCompleted: collaboration.milestones.filter(m => m.status === 'COMPLETED').length,
        totalMilestones: collaboration.milestones.length
      }
    });
  } catch (error) {
    console.error('Collaboration fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collaboration details',
      error: error.message
    });
  }
});

// === VIRTUAL EVENTS ===

// Create a virtual event
router.post('/events', async (req, res) => {
  try {
    const organizerId = req.user?.id || req.body.organizerId;
    const eventData = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type || 'LIVE_PERFORMANCE',
      category: req.body.category || 'ENTERTAINMENT',
      scheduledStart: req.body.scheduledStart,
      scheduledEnd: req.body.scheduledEnd,
      timezone: req.body.timezone || 'UTC',
      capacity: req.body.capacity || 1000,
      pricing: req.body.pricing || {
        free: false,
        tiers: [
          { name: 'General Admission', price: 10, features: ['HD Stream', 'Chat Access'] },
          { name: 'VIP Access', price: 25, features: ['HD Stream', 'Chat Access', 'Q&A Participation'] }
        ]
      },
      guestPerformers: req.body.guestPerformers || [],
      merchandise: req.body.merchandise || [],
      recording: req.body.recording || { enabled: false }
    };

    const event = await socialEngine.createVirtualEvent(organizerId, eventData);
    
    res.status(201).json({
      success: true,
      message: 'Virtual event created successfully',
      event,
      details: {
        eventId: event.id,
        type: event.type,
        scheduledStart: event.scheduledStart,
        capacity: event.capacity,
        pricingTiers: event.pricing.tiers.length,
        virtualVenue: event.virtualVenue.rooms.length
      }
    });
  } catch (error) {
    console.error('Virtual event creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create virtual event',
      error: error.message
    });
  }
});

// Get virtual event details
router.get('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = socialEngine.virtualEvents.get(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      event,
      analytics: {
        attendees: event.attendees.length,
        revenue: event.metadata.totalRevenue,
        engagement: event.metadata.engagement
      }
    });
  } catch (error) {
    console.error('Event fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event details',
      error: error.message
    });
  }
});

// === SOCIAL GAMING ===

// Create a social game
router.post('/games', async (req, res) => {
  try {
    const creatorId = req.user?.id || req.body.creatorId;
    const gameData = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type || 'TRIVIA',
      category: req.body.category || 'GENERAL',
      difficulty: req.body.difficulty || 'MEDIUM',
      maxPlayers: req.body.maxPlayers || 50,
      duration: req.body.duration || 30,
      prizes: req.body.prizes || [],
      entry: req.body.entry || { fee: 0, currency: 'USD' },
      chatEnabled: req.body.chatEnabled !== false,
      rounds: req.body.rounds
    };

    const game = await socialEngine.createSocialGame(creatorId, gameData);
    
    res.status(201).json({
      success: true,
      message: 'Social game created successfully',
      game,
      gameInfo: {
        gameId: game.id,
        type: game.type,
        difficulty: game.difficulty,
        maxPlayers: game.maxPlayers,
        duration: game.duration,
        rounds: game.rounds,
        questions: game.gameContent?.length || 0
      }
    });
  } catch (error) {
    console.error('Social game creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create social game',
      error: error.message
    });
  }
});

// Get game details
router.get('/games/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = socialEngine.socialGames.get(gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    res.json({
      success: true,
      game,
      gameStats: {
        participants: game.participants.length,
        spectators: game.spectators.length,
        currentRound: game.currentRound,
        gameState: game.gameState,
        winner: game.winner
      }
    });
  } catch (error) {
    console.error('Game fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch game details',
      error: error.message
    });
  }
});

// === COMMUNITY GROUPS ===

// Create a community group
router.post('/groups', async (req, res) => {
  try {
    const creatorId = req.user?.id || req.body.creatorId;
    const groupData = {
      name: req.body.name,
      description: req.body.description,
      type: req.body.type || 'FAN_CLUB',
      privacy: req.body.privacy || 'PUBLIC',
      category: req.body.category || 'GENERAL',
      membershipType: req.body.membershipType || 'FREE',
      membershipFee: req.body.membershipFee || 0,
      maxMembers: req.body.maxMembers || 1000,
      rules: req.body.rules || [],
      tags: req.body.tags || []
    };

    const group = await socialEngine.createCommunityGroup(creatorId, groupData);
    
    res.status(201).json({
      success: true,
      message: 'Community group created successfully',
      group,
      groupInfo: {
        groupId: group.id,
        type: group.type,
        privacy: group.privacy,
        membershipType: group.membershipType,
        maxMembers: group.maxMembers,
        achievements: group.achievements.length,
        chatRooms: group.chatRooms.length
      }
    });
  } catch (error) {
    console.error('Community group creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create community group',
      error: error.message
    });
  }
});

// Get group details
router.get('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = socialEngine.communityGroups.get(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.json({
      success: true,
      group,
      stats: {
        members: group.members.length,
        posts: group.posts.length,
        events: group.events.length,
        engagement: group.metadata.engagement
      }
    });
  } catch (error) {
    console.error('Group fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group details',
      error: error.message
    });
  }
});

// === SOCIAL CHALLENGES ===

// Create a social challenge
router.post('/challenges', async (req, res) => {
  try {
    const creatorId = req.user?.id || req.body.creatorId;
    const challengeData = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type || 'CONTENT_CHALLENGE',
      category: req.body.category || 'CREATIVE',
      difficulty: req.body.difficulty || 'MEDIUM',
      duration: req.body.duration || 7,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      requirements: req.body.requirements || [],
      prizes: req.body.prizes || [
        { place: 1, reward: '$100 + Feature', type: 'CASH_AND_PROMOTION' },
        { place: 2, reward: '$50 + Badge', type: 'CASH_AND_RECOGNITION' },
        { place: 3, reward: '$25 + Badge', type: 'CASH_AND_RECOGNITION' }
      ],
      rules: req.body.rules || [],
      hashtags: req.body.hashtags || [],
      judging: req.body.judging || {
        method: 'COMMUNITY_VOTE',
        criteria: ['Creativity', 'Quality', 'Originality']
      },
      featured: req.body.featured || false
    };

    const challenge = await socialEngine.createSocialChallenge(creatorId, challengeData);
    
    res.status(201).json({
      success: true,
      message: 'Social challenge created successfully',
      challenge,
      challengeInfo: {
        challengeId: challenge.id,
        type: challenge.type,
        difficulty: challenge.difficulty,
        duration: challenge.duration,
        prizes: challenge.prizes.length,
        hashtags: challenge.hashtags,
        featured: challenge.featured
      }
    });
  } catch (error) {
    console.error('Social challenge creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create social challenge',
      error: error.message
    });
  }
});

// Get challenge details
router.get('/challenges/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const challenge = socialEngine.socialChallenges.get(challengeId);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    res.json({
      success: true,
      challenge,
      stats: {
        participants: challenge.participants.length,
        submissions: challenge.submissions.length,
        votes: challenge.votes.length,
        engagement: challenge.metadata.engagement,
        viralScore: challenge.metadata.viralScore
      }
    });
  } catch (error) {
    console.error('Challenge fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenge details',
      error: error.message
    });
  }
});

// === CREATOR COLLECTIVES ===

// Create a creator collective
router.post('/collectives', async (req, res) => {
  try {
    const founderId = req.user?.id || req.body.founderId;
    const collectiveData = {
      name: req.body.name,
      description: req.body.description,
      mission: req.body.mission,
      type: req.body.type || 'CREATOR_NETWORK',
      category: req.body.category || 'MULTI_NICHE',
      membershipType: req.body.membershipType || 'INVITE_ONLY',
      maxMembers: req.body.maxMembers || 50,
      applicationRequired: req.body.applicationRequired !== false,
      requirements: req.body.requirements || [],
      benefits: req.body.benefits || [
        'Cross-promotion opportunities',
        'Collaborative content creation',
        'Shared resources and knowledge'
      ],
      revenueSharing: req.body.revenueSharing || { enabled: false }
    };

    const collective = await socialEngine.createCreatorCollective(founderId, collectiveData);
    
    res.status(201).json({
      success: true,
      message: 'Creator collective created successfully',
      collective,
      collectiveInfo: {
        collectiveId: collective.id,
        type: collective.type,
        membershipType: collective.membershipType,
        maxMembers: collective.maxMembers,
        revenueSharing: collective.revenueSharing.enabled,
        benefits: collective.benefits.length
      }
    });
  } catch (error) {
    console.error('Creator collective creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create creator collective',
      error: error.message
    });
  }
});

// === SOCIAL QUESTS ===

// Create a social quest
router.post('/quests', async (req, res) => {
  try {
    const creatorId = req.user?.id || req.body.creatorId;
    const questData = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type || 'ENGAGEMENT_QUEST',
      category: req.body.category || 'SOCIAL',
      difficulty: req.body.difficulty || 'MEDIUM',
      duration: req.body.duration || 14,
      objectives: req.body.objectives,
      rewards: req.body.rewards || [],
      requirements: req.body.requirements || [],
      hints: req.body.hints || [],
      milestones: req.body.milestones || [],
      collaborativeElements: req.body.collaborativeElements || false
    };

    const quest = await socialEngine.createSocialQuest(creatorId, questData);
    
    res.status(201).json({
      success: true,
      message: 'Social quest created successfully',
      quest,
      questInfo: {
        questId: quest.id,
        type: quest.type,
        difficulty: quest.difficulty,
        duration: quest.duration,
        objectives: quest.objectives.length,
        rewards: quest.rewards.length,
        collaborative: quest.collaborativeElements
      }
    });
  } catch (error) {
    console.error('Social quest creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create social quest',
      error: error.message
    });
  }
});

// === NETWORKING EVENTS ===

// Create a networking event
router.post('/networking', async (req, res) => {
  try {
    const organizerId = req.user?.id || req.body.organizerId;
    const eventData = {
      title: req.body.title,
      description: req.body.description,
      format: req.body.format || 'VIRTUAL',
      industry: req.body.industry || 'CONTENT_CREATION',
      targetAudience: req.body.targetAudience || 'ALL_CREATORS',
      scheduledDate: req.body.scheduledDate,
      duration: req.body.duration || 180,
      capacity: req.body.capacity || 200,
      price: req.body.price || 0,
      networkingFeatures: req.body.networkingFeatures || {
        speedNetworking: true,
        breakoutRooms: true,
        matchmaking: true,
        businessCardExchange: true,
        followUpSystem: true
      },
      speakers: req.body.speakers || [],
      sponsors: req.body.sponsors || []
    };

    const event = await socialEngine.createNetworkingEvent(organizerId, eventData);
    
    res.status(201).json({
      success: true,
      message: 'Networking event created successfully',
      event,
      eventInfo: {
        eventId: event.id,
        format: event.format,
        industry: event.industry,
        capacity: event.capacity,
        networkingFeatures: Object.keys(event.networkingFeatures).filter(f => event.networkingFeatures[f]).length,
        speakers: event.speakers.length
      }
    });
  } catch (error) {
    console.error('Networking event creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create networking event',
      error: error.message
    });
  }
});

// === SOCIAL OVERVIEW & RECOMMENDATIONS ===

// Get social overview for user
router.get('/overview/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const overview = await socialEngine.getSocialOverview(userId);
    
    res.json({
      success: true,
      overview,
      metadata: {
        generated: new Date().toISOString(),
        totalSocialActivities: Object.values(overview.social).reduce((sum, count) => sum + count, 0)
      }
    });
  } catch (error) {
    console.error('Social overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get social overview',
      error: error.message
    });
  }
});

// Get social recommendations
router.get('/recommendations/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const type = req.query.type || 'ALL';
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const recommendations = await socialEngine.getRecommendations(userId, type);
    
    res.json({
      success: true,
      recommendations,
      metadata: {
        type,
        generated: new Date().toISOString(),
        totalRecommendations: type === 'ALL' 
          ? Object.values(recommendations).reduce((sum, arr) => sum + arr.length, 0)
          : recommendations.length
      }
    });
  } catch (error) {
    console.error('Social recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get social recommendations',
      error: error.message
    });
  }
});

// === LIST ENDPOINTS ===

// List all meetups (with filtering)
router.get('/meetups', async (req, res) => {
  try {
    const { type, format, status, creatorId } = req.query;
    
    let meetups = Array.from(socialEngine.socialMeetups.values());
    
    if (type) meetups = meetups.filter(m => m.type === type);
    if (format) meetups = meetups.filter(m => m.format === format);
    if (status) meetups = meetups.filter(m => m.status === status);
    if (creatorId) meetups = meetups.filter(m => m.creatorId === creatorId);
    
    // Sort by scheduled date
    meetups = meetups.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    
    res.json({
      success: true,
      meetups: meetups.map(meetup => ({
        id: meetup.id,
        title: meetup.title,
        type: meetup.type,
        format: meetup.format,
        scheduledDate: meetup.scheduledDate,
        capacity: meetup.capacity,
        currentAttendees: meetup.attendees.length,
        status: meetup.status,
        price: meetup.price
      })),
      total: meetups.length
    });
  } catch (error) {
    console.error('Meetups list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meetups',
      error: error.message
    });
  }
});

// List all virtual events
router.get('/events', async (req, res) => {
  try {
    const { type, category, status, organizerId } = req.query;
    
    let events = Array.from(socialEngine.virtualEvents.values());
    
    if (type) events = events.filter(e => e.type === type);
    if (category) events = events.filter(e => e.category === category);
    if (status) events = events.filter(e => e.status === status);
    if (organizerId) events = events.filter(e => e.organizerId === organizerId);
    
    // Sort by scheduled start time
    events = events.sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart));
    
    res.json({
      success: true,
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        type: event.type,
        category: event.category,
        scheduledStart: event.scheduledStart,
        capacity: event.capacity,
        currentAttendees: event.attendees.length,
        status: event.status,
        pricingTiers: event.pricing.tiers.length
      })),
      total: events.length
    });
  } catch (error) {
    console.error('Events list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
});

// List all active challenges
router.get('/challenges', async (req, res) => {
  try {
    const { type, category, status, featured } = req.query;
    
    let challenges = Array.from(socialEngine.socialChallenges.values());
    
    if (type) challenges = challenges.filter(c => c.type === type);
    if (category) challenges = challenges.filter(c => c.category === category);
    if (status) challenges = challenges.filter(c => c.status === status);
    if (featured === 'true') challenges = challenges.filter(c => c.featured);
    
    // Sort by creation date (newest first)
    challenges = challenges.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({
      success: true,
      challenges: challenges.map(challenge => ({
        id: challenge.id,
        title: challenge.title,
        type: challenge.type,
        category: challenge.category,
        difficulty: challenge.difficulty,
        duration: challenge.duration,
        participants: challenge.participants.length,
        submissions: challenge.submissions.length,
        prizes: challenge.prizes.length,
        featured: challenge.featured,
        status: challenge.status
      })),
      total: challenges.length
    });
  } catch (error) {
    console.error('Challenges list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenges',
      error: error.message
    });
  }
});

// === HEALTH CHECK ===

// Social engine health check
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: {
        socialMeetups: socialEngine.socialMeetups.size,
        influencerCollaborations: socialEngine.influencerCollaborations.size,
        virtualEvents: socialEngine.virtualEvents.size,
        socialGames: socialEngine.socialGames.size,
        communityGroups: socialEngine.communityGroups.size,
        socialChallenges: socialEngine.socialChallenges.size,
        creatorCollectives: socialEngine.creatorCollectives.size,
        socialQuests: socialEngine.socialQuests.size,
        networkingEvents: socialEngine.networkingEvents.size
      },
      socialAI: socialEngine.socialAI,
      socialStreams: socialEngine.socialStreams
    };

    res.json({
      success: true,
      health
    });
  } catch (error) {
    console.error('Social health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Social health check failed',
      error: error.message
    });
  }
});

export default router;