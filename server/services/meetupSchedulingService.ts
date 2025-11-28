import { storage } from '../storage';
import { comprehensiveAnalyticsService } from './comprehensiveAnalyticsService';

interface MeetupRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: 'virtual_date' | 'video_call' | 'phone_call' | 'in_person' | 'event_attend' | 'collab';
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'expired';
  proposedTimes: {
    startTime: Date;
    endTime: Date;
    timezone: string;
    preference: 'preferred' | 'available' | 'maybe';
  }[];
  agreedTime?: {
    startTime: Date;
    endTime: Date;
    timezone: string;
  };
  details: {
    title: string;
    description: string;
    location?: string; // For in-person or virtual room
    price: number; // In cents
    duration: number; // In minutes
    requirements: string[];
    specialRequests?: string;
  };
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'disputed';
  meetingLink?: string; // For virtual meetings
  confirmationCode?: string; // For in-person verification
  reminders: {
    type: 'email' | 'push' | 'sms';
    scheduledFor: Date;
    sent: boolean;
  }[];
  feedback?: {
    rating: number;
    comment: string;
    reported: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

interface AvailabilitySchedule {
  userId: string;
  timezone: string;
  recurringSlots: {
    dayOfWeek: number; // 0-6 (Sunday = 0)
    startTime: string; // "09:00"
    endTime: string; // "17:00"
    isAvailable: boolean;
  }[];
  specificDates: {
    date: string; // "2024-01-15"
    slots: {
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      price?: number; // Override default price
    }[];
  }[];
  blackoutDates: string[]; // Dates when user is completely unavailable
  settings: {
    defaultPrice: number;
    minimumNotice: number; // Hours
    maximumAdvance: number; // Days
    allowBackToBack: boolean;
    bufferTime: number; // Minutes between appointments
    autoAccept: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface MeetupTemplate {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: 'virtual_date' | 'video_call' | 'phone_call' | 'in_person' | 'event_attend' | 'collab';
  duration: number; // minutes
  price: number; // cents
  requirements: string[];
  isActive: boolean;
  popularity: number; // How often it's booked
  customFields: {
    name: string;
    type: 'text' | 'select' | 'checkbox' | 'number';
    options?: string[];
    required: boolean;
  }[];
  createdAt: Date;
}

// Revolutionary meet-up and hook-up scheduling system
class MeetupSchedulingService {
  private activeMeetups = new Map<string, MeetupRequest>();
  private userAvailability = new Map<string, AvailabilitySchedule>();
  private notificationService: any; // Reference to notification service

  constructor() {
    this.initializeSchedulingSystem();
    this.startReminderService();
    this.startAvailabilitySync();
  }

  // ===== MEETUP REQUEST SYSTEM =====

  // Create new meetup request
  async createMeetupRequest(params: {
    fromUserId: string;
    toUserId: string;
    type: string;
    proposedTimes: any[];
    details: any;
  }): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      console.log(`💕 Creating meetup request: ${params.fromUserId} -> ${params.toUserId}`);

      // Validation checks
      const validationResult = await this.validateMeetupRequest(params);
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error };
      }

      const requestId = `meetup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const meetupRequest: MeetupRequest = {
        id: requestId,
        fromUserId: params.fromUserId,
        toUserId: params.toUserId,
        type: params.type as any,
        status: 'pending',
        proposedTimes: params.proposedTimes.map(time => ({
          ...time,
          startTime: new Date(time.startTime),
          endTime: new Date(time.endTime)
        })),
        details: params.details,
        paymentStatus: 'pending',
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      // Generate confirmation code for in-person meetings
      if (params.type === 'in_person') {
        meetupRequest.confirmationCode = this.generateConfirmationCode();
      }

      // Store request
      await storage.createMeetupRequest(meetupRequest);
      this.activeMeetups.set(requestId, meetupRequest);

      // Notify recipient
      await this.notifyMeetupRequest(meetupRequest);

      // Track analytics
      await comprehensiveAnalyticsService.trackEvent({
        userId: params.fromUserId,
        sessionId: `meetup_${requestId}`,
        eventType: 'interaction',
        eventName: 'meetup_requested',
        properties: {
          meetupType: params.type,
          recipientId: params.toUserId,
          proposedTimesCount: params.proposedTimes.length
        }
      });

      console.log(`✅ Meetup request created: ${requestId}`);
      return { success: true, requestId };

    } catch (error) {
      console.error('Meetup request creation failed:', error);
      return { success: false, error: 'Request creation failed' };
    }
  }

  // Respond to meetup request
  async respondToMeetupRequest(params: {
    requestId: string;
    userId: string;
    response: 'accept' | 'reject' | 'counter_offer';
    selectedTime?: any;
    counterOffer?: any;
    message?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`💌 User ${params.userId} responding to meetup: ${params.requestId}`);

      const request = await this.getMeetupRequest(params.requestId);
      if (!request || request.toUserId !== params.userId) {
        return { success: false, error: 'Request not found or access denied' };
      }

      if (request.status !== 'pending') {
        return { success: false, error: 'Request is no longer pending' };
      }

      switch (params.response) {
        case 'accept':
          await this.acceptMeetupRequest(request, params.selectedTime!);
          break;
        case 'reject':
          await this.rejectMeetupRequest(request, params.message);
          break;
        case 'counter_offer':
          await this.createCounterOffer(request, params.counterOffer!, params.message);
          break;
      }

      // Notify requester
      await this.notifyMeetupResponse(request, params.response, params.message);

      console.log(`✅ Meetup response processed: ${params.response}`);
      return { success: true };

    } catch (error) {
      console.error('Meetup response failed:', error);
      return { success: false, error: 'Response processing failed' };
    }
  }

  // ===== AVAILABILITY MANAGEMENT =====

  // Set user availability
  async setUserAvailability(params: {
    userId: string;
    timezone: string;
    recurringSlots: any[];
    specificDates?: any[];
    settings: any;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`📅 Setting availability for user: ${params.userId}`);

      const availability: AvailabilitySchedule = {
        userId: params.userId,
        timezone: params.timezone,
        recurringSlots: params.recurringSlots,
        specificDates: params.specificDates || [],
        blackoutDates: [],
        settings: {
          defaultPrice: params.settings.defaultPrice || 10000, // $100 default
          minimumNotice: params.settings.minimumNotice || 4, // 4 hours
          maximumAdvance: params.settings.maximumAdvance || 30, // 30 days
          allowBackToBack: params.settings.allowBackToBack || false,
          bufferTime: params.settings.bufferTime || 15, // 15 minutes
          autoAccept: params.settings.autoAccept || false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store availability
      await storage.setUserAvailability(availability);
      this.userAvailability.set(params.userId, availability);

      console.log(`✅ Availability set for user: ${params.userId}`);
      return { success: true };

    } catch (error) {
      console.error('Setting availability failed:', error);
      return { success: false, error: 'Failed to set availability' };
    }
  }

  // Get available time slots for a user
  async getAvailableSlots(params: {
    userId: string;
    startDate: Date;
    endDate: Date;
    duration: number; // minutes
    requesterTimezone?: string;
  }): Promise<{
    availableSlots: {
      startTime: Date;
      endTime: Date;
      price: number;
      canAutoAccept: boolean;
    }[];
    userTimezone: string;
    settings: any;
  }> {
    try {
      console.log(`🕐 Finding available slots for user: ${params.userId}`);

      const availability = await this.getUserAvailability(params.userId);
      if (!availability) {
        return { availableSlots: [], userTimezone: 'UTC', settings: {} };
      }

      // Get existing bookings to filter out unavailable times
      const existingBookings = await this.getUserBookings(params.userId, params.startDate, params.endDate);

      // Generate available slots
      const availableSlots = await this.calculateAvailableSlots(
        availability,
        existingBookings,
        params.startDate,
        params.endDate,
        params.duration
      );

      return {
        availableSlots,
        userTimezone: availability.timezone,
        settings: availability.settings
      };

    } catch (error) {
      console.error('Getting available slots failed:', error);
      return { availableSlots: [], userTimezone: 'UTC', settings: {} };
    }
  }

  // ===== CALENDAR INTEGRATION =====

  // Sync with external calendar
  async syncWithExternalCalendar(params: {
    userId: string;
    calendarType: 'google' | 'outlook' | 'apple' | 'custom';
    accessToken: string;
    settings: {
      syncDirection: 'import' | 'export' | 'bidirectional';
      autoBlock: boolean;
      eventPrefix?: string;
    };
  }): Promise<{ success: boolean; syncedEvents?: number; error?: string }> {
    try {
      console.log(`📅 Syncing calendar for user: ${params.userId} (${params.calendarType})`);

      // Implementation would integrate with calendar APIs
      const syncResult = await this.performCalendarSync(params);

      // Update user's availability based on calendar
      if (params.settings.autoBlock && syncResult.busySlots) {
        await this.blockSlotsFromCalendar(params.userId, syncResult.busySlots);
      }

      console.log(`✅ Calendar sync completed: ${syncResult.eventCount} events`);
      return { success: true, syncedEvents: syncResult.eventCount };

    } catch (error) {
      console.error('Calendar sync failed:', error);
      return { success: false, error: 'Calendar sync failed' };
    }
  }

  // ===== MEETUP TEMPLATES =====

  // Create meetup template
  async createMeetupTemplate(params: {
    userId: string;
    name: string;
    description: string;
    type: string;
    duration: number;
    price: number;
    requirements: string[];
    customFields: any[];
  }): Promise<{ success: boolean; templateId?: string; error?: string }> {
    try {
      console.log(`📋 Creating meetup template: ${params.name}`);

      const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const template: MeetupTemplate = {
        id: templateId,
        userId: params.userId,
        name: params.name,
        description: params.description,
        type: params.type as any,
        duration: params.duration,
        price: params.price,
        requirements: params.requirements,
        isActive: true,
        popularity: 0,
        customFields: params.customFields,
        createdAt: new Date()
      };

      await storage.createMeetupTemplate(template);

      console.log(`✅ Meetup template created: ${templateId}`);
      return { success: true, templateId };

    } catch (error) {
      console.error('Template creation failed:', error);
      return { success: false, error: 'Template creation failed' };
    }
  }

  // Get user's meetup templates
  async getUserMeetupTemplates(userId: string): Promise<MeetupTemplate[]> {
    try {
      const templates = await storage.getUserMeetupTemplates(userId);
      return templates.sort((a, b) => b.popularity - a.popularity);
    } catch (error) {
      console.error('Failed to get user templates:', error);
      return [];
    }
  }

  // ===== MEETUP MATCHING =====

  // Find potential meetup matches based on compatibility
  async findMeetupMatches(params: {
    userId: string;
    type: string;
    location?: string;
    maxDistance?: number; // km for in-person
    priceRange?: { min: number; max: number };
    availability?: { startDate: Date; endDate: Date };
  }): Promise<{
    matches: {
      userId: string;
      username: string;
      avatar: string;
      compatibility: number;
      availableSlots: any[];
      templates: MeetupTemplate[];
      distance?: number;
    }[];
    totalMatches: number;
  }> {
    try {
      console.log(`💘 Finding meetup matches for user: ${params.userId}`);

      // Get potential matches based on criteria
      const potentialMatches = await storage.findMeetupMatches({
        excludeUserId: params.userId,
        type: params.type,
        location: params.location,
        maxDistance: params.maxDistance,
        priceRange: params.priceRange
      });

      // Calculate compatibility and get availability
      const matches = await Promise.all(
        potentialMatches.map(async (match) => {
          const compatibility = await this.calculateMeetupCompatibility(params.userId, match.id);
          const availableSlots = params.availability ? 
            await this.getAvailableSlots({
              userId: match.id,
              startDate: params.availability.startDate,
              endDate: params.availability.endDate,
              duration: 60 // Default 1 hour
            }) : { availableSlots: [] };

          const templates = await this.getUserMeetupTemplates(match.id);

          return {
            userId: match.id,
            username: match.username,
            avatar: match.avatar || '',
            compatibility,
            availableSlots: availableSlots.availableSlots,
            templates: templates.filter(t => t.type === params.type),
            distance: match.distance
          };
        })
      );

      // Sort by compatibility and availability
      const sortedMatches = matches
        .filter(match => match.compatibility > 0.3) // Minimum compatibility threshold
        .sort((a, b) => b.compatibility - a.compatibility);

      return {
        matches: sortedMatches,
        totalMatches: sortedMatches.length
      };

    } catch (error) {
      console.error('Finding meetup matches failed:', error);
      return { matches: [], totalMatches: 0 };
    }
  }

  // ===== VIRTUAL MEETING MANAGEMENT =====

  // Create virtual meeting room
  async createVirtualMeetingRoom(meetupId: string): Promise<{ roomUrl: string; roomId: string }> {
    try {
      console.log(`🎥 Creating virtual room for meetup: ${meetupId}`);

      // Integration with video calling service (e.g., Jitsi, Zoom, custom)
      const roomId = `boyfanz_meetup_${meetupId}`;
      const roomUrl = `https://meet.boyfanz.com/room/${roomId}`;

      // Store room details
      await storage.storeMeetingRoom({
        meetupId,
        roomId,
        roomUrl,
        createdAt: new Date()
      });

      return { roomUrl, roomId };

    } catch (error) {
      console.error('Virtual room creation failed:', error);
      throw error;
    }
  }

  // ===== SAFETY & VERIFICATION =====

  // Verify meetup participants for in-person meetings
  async verifyMeetupParticipants(params: {
    meetupId: string;
    userId: string;
    verificationType: 'photo' | 'location' | 'confirmation_code';
    verificationData: any;
  }): Promise<{ verified: boolean; error?: string }> {
    try {
      console.log(`🔍 Verifying meetup participant: ${params.userId}`);

      const meetup = await this.getMeetupRequest(params.meetupId);
      if (!meetup) {
        return { verified: false, error: 'Meetup not found' };
      }

      let verified = false;

      switch (params.verificationType) {
        case 'confirmation_code':
          verified = params.verificationData.code === meetup.confirmationCode;
          break;
        case 'location':
          verified = await this.verifyLocation(params.verificationData.location, meetup.details.location!);
          break;
        case 'photo':
          verified = await this.verifyPhotoMatch(params.userId, params.verificationData.photo);
          break;
      }

      if (verified) {
        await storage.markMeetupVerified(params.meetupId, params.userId);
      }

      return { verified };

    } catch (error) {
      console.error('Meetup verification failed:', error);
      return { verified: false, error: 'Verification failed' };
    }
  }

  // ===== HELPER METHODS =====

  private async initializeSchedulingSystem(): Promise<void> {
    console.log('📅 Initializing meetup scheduling system');
  }

  private startReminderService(): void {
    // Send reminders for upcoming meetups
    setInterval(async () => {
      await this.processPendingReminders();
    }, 300000); // Every 5 minutes
  }

  private startAvailabilitySync(): void {
    // Sync availability with external calendars
    console.log('🔄 Starting availability sync service');
  }

  private async validateMeetupRequest(params: any): Promise<{ valid: boolean; error?: string }> {
    // Validate request parameters
    if (!params.proposedTimes || params.proposedTimes.length === 0) {
      return { valid: false, error: 'At least one proposed time is required' };
    }

    if (params.details.price < 0) {
      return { valid: false, error: 'Invalid price' };
    }

    return { valid: true };
  }

  private generateConfirmationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async notifyMeetupRequest(request: MeetupRequest): Promise<void> {
    console.log(`📬 Notifying user ${request.toUserId} about meetup request`);
  }

  private async getMeetupRequest(requestId: string): Promise<MeetupRequest | null> {
    if (this.activeMeetups.has(requestId)) {
      return this.activeMeetups.get(requestId)!;
    }

    const request = await storage.getMeetupRequest(requestId);
    if (request) {
      this.activeMeetups.set(requestId, request);
    }

    return request;
  }

  private async acceptMeetupRequest(request: MeetupRequest, selectedTime: any): Promise<void> {
    request.status = 'accepted';
    request.agreedTime = {
      startTime: new Date(selectedTime.startTime),
      endTime: new Date(selectedTime.endTime),
      timezone: selectedTime.timezone
    };
    request.updatedAt = new Date();

    // Create virtual meeting room if needed
    if (['virtual_date', 'video_call'].includes(request.type)) {
      const room = await this.createVirtualMeetingRoom(request.id);
      request.meetingLink = room.roomUrl;
    }

    await this.updateMeetupRequest(request);
    await this.scheduleReminders(request);
  }

  private async rejectMeetupRequest(request: MeetupRequest, message?: string): Promise<void> {
    request.status = 'rejected';
    request.updatedAt = new Date();
    if (message) {
      request.metadata.rejectionMessage = message;
    }

    await this.updateMeetupRequest(request);
  }

  private async createCounterOffer(request: MeetupRequest, counterOffer: any, message?: string): Promise<void> {
    // Create new request with counter offer details
    const counterOfferId = `counter_${request.id}_${Date.now()}`;
    
    const counterRequest: MeetupRequest = {
      ...request,
      id: counterOfferId,
      fromUserId: request.toUserId,
      toUserId: request.fromUserId,
      proposedTimes: counterOffer.proposedTimes,
      details: { ...request.details, ...counterOffer.details },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { originalRequestId: request.id, counterOfferMessage: message }
    };

    await storage.createMeetupRequest(counterRequest);
    
    // Update original request
    request.status = 'rejected';
    request.metadata.counterOfferId = counterOfferId;
    await this.updateMeetupRequest(request);
  }

  private async notifyMeetupResponse(request: MeetupRequest, response: string, message?: string): Promise<void> {
    console.log(`📨 Notifying user ${request.fromUserId} about response: ${response}`);
  }

  private async getUserAvailability(userId: string): Promise<AvailabilitySchedule | null> {
    if (this.userAvailability.has(userId)) {
      return this.userAvailability.get(userId)!;
    }

    const availability = await storage.getUserAvailability(userId);
    if (availability) {
      this.userAvailability.set(userId, availability);
    }

    return availability;
  }

  private async getUserBookings(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return await storage.getUserBookings(userId, startDate, endDate);
  }

  private async calculateAvailableSlots(
    availability: AvailabilitySchedule,
    bookings: any[],
    startDate: Date,
    endDate: Date,
    duration: number
  ): Promise<any[]> {
    // Complex algorithm to calculate available time slots
    // This is a simplified implementation
    return [
      {
        startTime: new Date(),
        endTime: new Date(Date.now() + duration * 60000),
        price: availability.settings.defaultPrice,
        canAutoAccept: availability.settings.autoAccept
      }
    ];
  }

  private async updateMeetupRequest(request: MeetupRequest): Promise<void> {
    await storage.updateMeetupRequest(request.id, request);
    this.activeMeetups.set(request.id, request);
  }

  private async scheduleReminders(request: MeetupRequest): Promise<void> {
    if (!request.agreedTime) return;

    const reminderTimes = [
      new Date(request.agreedTime.startTime.getTime() - 24 * 60 * 60 * 1000), // 24 hours before
      new Date(request.agreedTime.startTime.getTime() - 2 * 60 * 60 * 1000),  // 2 hours before
      new Date(request.agreedTime.startTime.getTime() - 15 * 60 * 1000)       // 15 minutes before
    ];

    for (const reminderTime of reminderTimes) {
      if (reminderTime > new Date()) {
        await storage.scheduleReminder({
          meetupId: request.id,
          userId: request.fromUserId,
          reminderTime,
          type: 'push'
        });
      }
    }
  }

  private async processPendingReminders(): Promise<void> {
    const pendingReminders = await storage.getPendingReminders();
    
    for (const reminder of pendingReminders) {
      await this.sendReminder(reminder);
      await storage.markReminderSent(reminder.id);
    }
  }

  private async sendReminder(reminder: any): Promise<void> {
    console.log(`⏰ Sending reminder to user ${reminder.userId} for meetup ${reminder.meetupId}`);
  }

  private async performCalendarSync(params: any): Promise<{ eventCount: number; busySlots?: any[] }> {
    // Mock calendar sync
    return { eventCount: 5, busySlots: [] };
  }

  private async blockSlotsFromCalendar(userId: string, busySlots: any[]): Promise<void> {
    console.log(`📅 Blocking ${busySlots.length} calendar slots for user ${userId}`);
  }

  private async calculateMeetupCompatibility(userId1: string, userId2: string): Promise<number> {
    // Algorithm to calculate compatibility based on preferences, past interactions, etc.
    return Math.random() * 0.7 + 0.3; // Mock compatibility score 0.3-1.0
  }

  private async verifyLocation(providedLocation: any, expectedLocation: string): Promise<boolean> {
    // Verify user is at the expected location
    return true; // Mock verification
  }

  private async verifyPhotoMatch(userId: string, photo: string): Promise<boolean> {
    // Verify photo matches user profile
    return true; // Mock verification
  }
}

export const meetupSchedulingService = new MeetupSchedulingService();