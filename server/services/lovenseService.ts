import { 
  LovenseDevice, 
  LovenseDeviceAction, 
  LovenseIntegrationSettings,
  InsertLovenseDevice,
  InsertLovenseDeviceAction,
  InsertLovenseIntegrationSettings,
  UpdateLovenseIntegrationSettings,
  LovenseDeviceControl,
  // Enhanced Lovense integration
  LovenseAccount,
  InsertLovenseAccount,
  LovenseMapping,
  InsertLovenseMapping,
  LovenseSession,
  InsertLovenseSession
} from '@shared/schema';
import { storage } from '../storage';
import { WebSocket } from 'ws';
import { randomBytes, createHash } from 'crypto';

interface LovenseConnectResponse {
  result: boolean;
  message?: string;
  code?: number;
  data?: any;
}

interface LovenseDeviceInfo {
  id: string;
  name: string;
  type: string;
  battery: number;
  status: 'connected' | 'disconnected';
}

interface LovenseToyCommand {
  command: 'Vibrate' | 'Rotate' | 'Pump' | 'Stop';
  action: string;
  timeSec?: number;
  loopRunningSec?: number;
  loopPauseSec?: number;
  toy?: string;
  apiVer?: number;
}

class LovenseService {
  private baseUrl = 'https://api.lovense.com/api/lan';
  private defaultTimeout = 30000; // 30 seconds
  
  /**
   * Get creator's Lovense integration settings
   */
  async getCreatorSettings(creatorId: string): Promise<LovenseIntegrationSettings | null> {
    try {
      const settings = await storage.getLovenseIntegrationSettings(creatorId);
      return settings || null;
    } catch (error) {
      console.error(`Error getting Lovense settings for creator ${creatorId}:`, error);
      return null;
    }
  }

  /**
   * Update creator's Lovense integration settings
   */
  async updateCreatorSettings(
    creatorId: string, 
    settings: UpdateLovenseIntegrationSettings
  ): Promise<LovenseIntegrationSettings> {
    try {
      const updated = await storage.updateLovenseIntegrationSettings(creatorId, settings);
      return updated;
    } catch (error) {
      console.error(`Error updating Lovense settings for creator ${creatorId}:`, error);
      throw error;
    }
  }

  /**
   * Get all devices for a creator
   */
  async getCreatorDevices(creatorId: string): Promise<LovenseDevice[]> {
    try {
      const devices = await storage.getLovenseDevices(creatorId);
      return devices;
    } catch (error) {
      console.error(`Error getting devices for creator ${creatorId}:`, error);
      return [];
    }
  }

  /**
   * Sync devices from Lovense Connect app
   */
  async syncDevices(creatorId: string): Promise<{ success: boolean; devices: LovenseDevice[] }> {
    try {
      const settings = await this.getCreatorSettings(creatorId);
      if (!settings?.connectAppToken || !settings.isEnabled) {
        throw new Error('Lovense integration not configured or disabled');
      }

      // Get devices from Lovense Connect
      const devices = await this.getDevicesFromConnect(settings.connectAppToken);
      const syncedDevices: LovenseDevice[] = [];

      for (const deviceInfo of devices) {
        // Check if device already exists
        const existingDevice = await storage.getLovenseDeviceByDeviceId(creatorId, deviceInfo.id);
        
        if (existingDevice) {
          // Update existing device
          const updated = await storage.updateLovenseDevice(existingDevice.id, {
            deviceName: deviceInfo.name,
            deviceType: deviceInfo.type,
            status: deviceInfo.status,
            batteryLevel: deviceInfo.battery,
            lastConnected: new Date()
          });
          syncedDevices.push(updated);
        } else {
          // Add new device
          const newDevice: InsertLovenseDevice = {
            deviceId: deviceInfo.id,
            deviceName: deviceInfo.name,
            deviceType: deviceInfo.type,
            isEnabled: true
          };
          const created = await storage.createLovenseDevice(creatorId, newDevice);
          syncedDevices.push(created);
        }
      }

      // Note: Last sync time will be tracked in the future

      return { success: true, devices: syncedDevices };
    } catch (error) {
      console.error(`Error syncing devices for creator ${creatorId}:`, error);
      return { success: false, devices: [] };
    }
  }

  /**
   * Control a specific device
   */
  async controlDevice(
    creatorId: string,
    deviceId: string,
    control: LovenseDeviceControl,
    triggeredByUserId?: string,
    streamId?: string,
    tipAmount?: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const settings = await this.getCreatorSettings(creatorId);
      if (!settings?.connectAppToken || !settings.isEnabled) {
        throw new Error('Lovense integration not configured or disabled');
      }

      const device = await storage.getLovenseDevice(deviceId);
      if (!device || device.creatorId !== creatorId || !device.isEnabled) {
        throw new Error('Device not found or not accessible');
      }

      // Build Lovense command
      const command = this.buildLovenseCommand(control, device.deviceType);
      
      // Send command to Lovense Connect
      const response = await this.sendCommandToConnect(settings.connectAppToken, command);
      
      if (response.result) {
        // Log the action
        const action: InsertLovenseDeviceAction = {
          deviceId: device.id,
          streamId,
          actionType: tipAmount ? 'tip' : 'manual',
          intensity: control.intensity,
          duration: control.duration,
          pattern: control.pattern,
          tipAmount,
          metadata: { command, response }
        };
        await storage.createLovenseDeviceAction(action);

        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message || 'Failed to control device' };
      }
    } catch (error) {
      console.error(`Error controlling device ${deviceId}:`, error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Process tip and trigger device vibration (now with pattern mapping integration)
   */
  async processTipVibration(
    creatorId: string,
    tipAmountCents: number,
    triggeredByUserId: string,
    streamId?: string
  ): Promise<{ success: boolean; actions: number }> {
    try {
      const settings = await this.getCreatorSettings(creatorId);
      if (!settings?.isEnabled) {
        return { success: false, actions: 0 };
      }

      // Check if tip meets minimum threshold
      if (tipAmountCents < (settings.tipMinimum || 100)) {
        return { success: false, actions: 0 };
      }

      // First try to process with custom pattern mappings
      const mappingResult = await this.processEventWithMappings(
        creatorId,
        'tip',
        tipAmountCents,
        triggeredByUserId,
        streamId
      );

      // If custom mappings were found and executed successfully, return that result
      if (mappingResult.success && mappingResult.actionsTriggered > 0) {
        return { success: true, actions: mappingResult.actionsTriggered };
      }

      // Fall back to default tip processing if no custom mappings or they failed
      const devices = await storage.getActiveLovenseDevices(creatorId);
      if (devices.length === 0) {
        return { success: false, actions: 0 };
      }

      // Calculate vibration intensity based on tip amount (default behavior)
      const intensity = this.calculateIntensityFromTip(tipAmountCents, settings);
      const duration = this.calculateDurationFromTip(tipAmountCents, settings);

      let successfulActions = 0;

      // Control each device with default pattern
      for (const device of devices) {
        const control: LovenseDeviceControl = {
          action: 'vibrate',
          intensity,
          duration
        };

        const result = await this.controlDevice(
          creatorId,
          device.id,
          control,
          triggeredByUserId,
          streamId,
          tipAmountCents
        );

        if (result.success) {
          successfulActions++;
        }
      }

      return { success: successfulActions > 0, actions: successfulActions };
    } catch (error) {
      console.error(`Error processing tip vibration for creator ${creatorId}:`, error);
      return { success: false, actions: 0 };
    }
  }

  /**
   * Test device connectivity
   */
  async testDevice(creatorId: string, deviceId: string): Promise<{ success: boolean; battery?: number; message?: string }> {
    try {
      const settings = await this.getCreatorSettings(creatorId);
      if (!settings?.connectAppToken) {
        throw new Error('Lovense integration not configured');
      }

      const device = await storage.getLovenseDevice(deviceId);
      if (!device || device.creatorId !== creatorId) {
        throw new Error('Device not found or not accessible');
      }

      // Test with a gentle vibration
      const testCommand: LovenseToyCommand = {
        command: 'Vibrate',
        action: 'Vibrate:5;',
        timeSec: 2,
        toy: device.deviceId,
        apiVer: 1
      };

      const response = await this.sendCommandToConnect(settings.connectAppToken, testCommand);
      
      if (response.result) {
        // Update device status
        await storage.updateLovenseDevice(device.id, {
          status: 'connected',
          batteryLevel: response.data?.battery || device.batteryLevel,
          lastConnected: new Date()
        });

        return { 
          success: true, 
          battery: response.data?.battery,
          message: 'Device test successful' 
        };
      } else {
        await storage.updateLovenseDevice(device.id, { status: 'error' });
        return { success: false, message: response.message || 'Device test failed' };
      }
    } catch (error) {
      console.error(`Error testing device ${deviceId}:`, error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get devices from Lovense Connect app
   */
  private async getDevicesFromConnect(token: string): Promise<LovenseDeviceInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/getToys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(this.defaultTimeout)
      });

      const data: LovenseConnectResponse = await response.json();
      
      if (data.result && data.data?.toys) {
        return Object.values(data.data.toys).map((toy: any) => ({
          id: toy.id,
          name: toy.name,
          type: toy.type,
          battery: toy.battery || 0,
          status: toy.status === 1 ? 'connected' : 'disconnected'
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching devices from Lovense Connect:', error);
      return [];
    }
  }

  /**
   * Send command to Lovense Connect app
   */
  private async sendCommandToConnect(token: string, command: LovenseToyCommand): Promise<LovenseConnectResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...command }),
        signal: AbortSignal.timeout(this.defaultTimeout)
      });

      return await response.json();
    } catch (error) {
      console.error('Error sending command to Lovense Connect:', error);
      return { result: false, message: 'Connection timeout or network error' };
    }
  }

  /**
   * Build Lovense command from control object
   */
  private buildLovenseCommand(control: LovenseDeviceControl, deviceType: string): LovenseToyCommand {
    const { action, intensity = 10, duration = 5, pattern } = control;
    
    let command: LovenseToyCommand;
    
    switch (action) {
      case 'vibrate':
        command = {
          command: 'Vibrate',
          action: pattern ? `Vibrate:${pattern};` : `Vibrate:${Math.min(intensity, 20)};`,
          timeSec: duration
        };
        break;
      case 'rotate':
        command = {
          command: 'Rotate',
          action: `Rotate:${Math.min(intensity, 20)};`,
          timeSec: duration
        };
        break;
      case 'pump':
        command = {
          command: 'Pump',
          action: `Pump:${Math.min(intensity, 3)};`,
          timeSec: duration
        };
        break;
      case 'stop':
      default:
        command = {
          command: 'Stop',
          action: 'Stop;'
        };
        break;
    }

    return { ...command, apiVer: 1 };
  }

  /**
   * Calculate vibration intensity based on tip amount
   */
  private calculateIntensityFromTip(tipCents: number, settings: LovenseIntegrationSettings): number {
    const { tipMinimum, tipMaximum, intensityMapping } = settings;
    
    // Use custom mapping if available
    if (intensityMapping && typeof intensityMapping === 'object') {
      const mapping = intensityMapping as Record<string, number>;
      const tipDollar = Math.floor(tipCents / 100);
      
      if (mapping[tipDollar.toString()]) {
        return Math.min(mapping[tipDollar.toString()], 20);
      }
    }

    // Default linear mapping
    const minTip = tipMinimum || 100;
    const maxTip = tipMaximum || 10000;
    const ratio = Math.min((tipCents - minTip) / (maxTip - minTip), 1);
    return Math.max(1, Math.round(ratio * 20));
  }

  /**
   * Calculate vibration duration based on tip amount
   */
  private calculateDurationFromTip(tipCents: number, settings: LovenseIntegrationSettings): number {
    const tipDollars = tipCents / 100;
    
    // Duration ranges from 2 seconds (small tips) to 30 seconds (large tips)
    if (tipDollars < 1) return 2;
    if (tipDollars < 5) return 5;
    if (tipDollars < 10) return 10;
    if (tipDollars < 25) return 15;
    if (tipDollars < 50) return 20;
    return 30;
  }

  // ====================================
  // ENHANCED INTEGRATION FEATURES
  // ====================================

  /**
   * OAuth Pairing: Generate QR code for device pairing
   */
  async generatePairingQRCode(userId: string): Promise<{ success: boolean; qrCodeData?: any; error?: string }> {
    try {
      // Generate cryptographically secure pairing token using Node.js crypto
      const pairingToken = randomBytes(16).toString('hex'); // 128-bit token
      
      // Token expires in 10 minutes
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      const qrCodeData = {
        action: 'pair',
        token: pairingToken,
        platform: 'boyfanz',
        expiresAt: expiresAt.toISOString()
      };

      // Check if user already has an account
      const existingAccount = await storage.getLovenseAccount(userId);
      
      if (existingAccount) {
        // Update existing account with new QR code data and token hash
        await storage.updateLovenseAccount(userId, {
          qrCodeData: { ...qrCodeData, tokenHash: this.hashToken(pairingToken) },
          connectionStatus: 'disconnected',
          authType: 'qr_code',
          tokenExpiry: expiresAt
        });
      } else {
        // Create new OAuth account record
        const newAccount: InsertLovenseAccount = {
          userId,
          authType: 'qr_code',
          qrCodeData: { ...qrCodeData, tokenHash: this.hashToken(pairingToken) },
          connectionStatus: 'disconnected',
          tokenExpiry: expiresAt
        };
        await storage.createLovenseAccount(newAccount);
      }

      return { success: true, qrCodeData };
    } catch (error) {
      console.error(`Error generating QR code for user ${userId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * OAuth Pairing: Complete device pairing from QR code scan
   */
  async completePairing(userId: string, token: string, deviceData: any): Promise<{ success: boolean; account?: LovenseAccount; error?: string }> {
    try {
      // Validate and consume token atomically
      const isValid = await this.validateAndConsumePairingToken(userId, token);
      if (!isValid) {
        throw new Error('Invalid or expired pairing token');
      }

      // Validate device data structure
      if (!this.validateDeviceData(deviceData)) {
        throw new Error('Invalid device data provided');
      }

      // Update account with connection info
      const updatedAccount = await storage.updateLovenseAccount(userId, {
        connectionStatus: 'connected',
        lastConnectedAt: new Date(),
        qrCodeData: { deviceData, paired: true }
      });

      return { success: true, account: updatedAccount };
    } catch (error) {
      console.error(`Error completing pairing for user ${userId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * OAuth Pairing: Get current pairing status
   */
  async getPairingStatus(userId: string): Promise<{ status: string; account?: LovenseAccount; lastConnected?: Date }> {
    try {
      const account = await storage.getLovenseAccount(userId);
      if (!account) {
        return { status: 'not_paired' };
      }

      return {
        status: account.connectionStatus,
        account,
        lastConnected: account.lastConnectedAt || undefined
      };
    } catch (error) {
      console.error(`Error getting pairing status for user ${userId}:`, error);
      return { status: 'error' };
    }
  }

  /**
   * WebSocket Lifecycle: Create new session
   */
  async createWebSocketSession(userId: string, sessionId: string, streamId?: string, clientInfo?: any): Promise<LovenseSession> {
    const session: InsertLovenseSession = {
      userId,
      sessionId,
      streamId,
      connectionStatus: 'connecting',
      clientInfo: clientInfo || {},
      connectedAt: new Date()
    };

    return await storage.createLovenseSession(session);
  }

  /**
   * WebSocket Lifecycle: Update session status
   */
  async updateSessionStatus(sessionId: string, status: string, additionalData?: any): Promise<{ success: boolean }> {
    try {
      const updates: Partial<LovenseSession> = {
        connectionStatus: status,
        lastPingAt: new Date()
      };

      if (status === 'connected') {
        updates.connectedAt = new Date();
      } else if (status === 'disconnected') {
        updates.disconnectedAt = new Date();
      }

      if (additionalData) {
        updates.clientInfo = additionalData;
      }

      await storage.updateLovenseSession(sessionId, updates);
      return { success: true };
    } catch (error) {
      console.error(`Error updating session ${sessionId}:`, error);
      return { success: false };
    }
  }

  /**
   * WebSocket Lifecycle: Handle session ping
   */
  async pingSession(sessionId: string): Promise<{ success: boolean }> {
    try {
      await storage.updateLovenseSession(sessionId, {
        lastPingAt: new Date()
      });
      return { success: true };
    } catch (error) {
      console.error(`Error pinging session ${sessionId}:`, error);
      return { success: false };
    }
  }

  /**
   * WebSocket Lifecycle: Disconnect session
   */
  async disconnectSession(sessionId: string): Promise<{ success: boolean }> {
    try {
      await storage.disconnectLovenseSession(sessionId);
      return { success: true };
    } catch (error) {
      console.error(`Error disconnecting session ${sessionId}:`, error);
      return { success: false };
    }
  }

  /**
   * WebSocket Lifecycle: Get active sessions for user
   */
  async getActiveSessions(userId: string): Promise<LovenseSession[]> {
    try {
      return await storage.getActiveLovenseSessions(userId);
    } catch (error) {
      console.error(`Error getting active sessions for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * WebSocket Lifecycle: Cleanup inactive sessions
   */
  async cleanupInactiveSessions(): Promise<{ cleaned: number }> {
    try {
      const cleaned = await storage.cleanupInactiveLovenseSessions();
      return { cleaned };
    } catch (error) {
      console.error('Error cleaning up inactive sessions:', error);
      return { cleaned: 0 };
    }
  }

  /**
   * Enhanced Pattern Controls: Create custom pattern mapping
   */
  async createPatternMapping(
    userId: string, 
    eventType: string, 
    triggerValue: number, 
    pattern: string, 
    intensity: number, 
    duration: number
  ): Promise<{ success: boolean; mapping?: LovenseMapping; error?: string }> {
    try {
      const mapping: InsertLovenseMapping = {
        userId,
        eventType,
        triggerValue,
        pattern,
        intensity,
        duration,
        isActive: true
      };

      const created = await storage.createLovenseMapping(mapping);
      return { success: true, mapping: created };
    } catch (error) {
      console.error(`Error creating pattern mapping for user ${userId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Enhanced Pattern Controls: Get user's pattern mappings
   */
  async getUserPatternMappings(userId: string, eventType?: string): Promise<LovenseMapping[]> {
    try {
      if (eventType) {
        return await storage.getLovenseMappingsByEvent(userId, eventType);
      }
      return await storage.getLovenseMappings(userId);
    } catch (error) {
      console.error(`Error getting pattern mappings for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Enhanced Pattern Controls: Update pattern mapping
   */
  async updatePatternMapping(
    mappingId: string, 
    updates: Partial<LovenseMapping>
  ): Promise<{ success: boolean; mapping?: LovenseMapping; error?: string }> {
    try {
      const updated = await storage.updateLovenseMapping(mappingId, updates);
      return { success: true, mapping: updated };
    } catch (error) {
      console.error(`Error updating pattern mapping ${mappingId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Enhanced Pattern Controls: Delete pattern mapping
   */
  async deletePatternMapping(mappingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await storage.deleteLovenseMapping(mappingId);
      return { success: true };
    } catch (error) {
      console.error(`Error deleting pattern mapping ${mappingId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Enhanced Pattern Controls: Process event with custom mappings
   */
  async processEventWithMappings(
    userId: string,
    eventType: string,
    eventValue: number,
    triggeredByUserId?: string,
    streamId?: string
  ): Promise<{ success: boolean; actionsTriggered: number; patterns: string[] }> {
    try {
      // Get mappings for this event type
      const mappings = await storage.getLovenseMappingsByEvent(userId, eventType);
      
      // Find applicable mappings based on trigger value
      const applicableMappings = mappings.filter(mapping => {
        if (eventType === 'tip') {
          // For tips, find the mapping with the highest trigger value that's <= event value
          return mapping.triggerValue! <= eventValue;
        }
        // For other events, exact match or no trigger value
        return !mapping.triggerValue || mapping.triggerValue === eventValue;
      });

      if (applicableMappings.length === 0) {
        // Fall back to default tip processing if no custom mappings
        if (eventType === 'tip') {
          const result = await this.processTipVibration(userId, eventValue, triggeredByUserId!, streamId);
          return { 
            success: result.success, 
            actionsTriggered: result.actions,
            patterns: ['default_tip_pattern']
          };
        }
        return { success: false, actionsTriggered: 0, patterns: [] };
      }

      // Get user's devices
      const devices = await storage.getActiveLovenseDevices(userId);
      if (devices.length === 0) {
        return { success: false, actionsTriggered: 0, patterns: [] };
      }

      let actionsTriggered = 0;
      const patternsUsed: string[] = [];

      // Apply each mapping
      for (const mapping of applicableMappings) {
        for (const device of devices) {
          const control: LovenseDeviceControl = {
            action: mapping.pattern.includes('vibrate') ? 'vibrate' : 
                   mapping.pattern.includes('rotate') ? 'rotate' : 
                   mapping.pattern.includes('pump') ? 'pump' : 'vibrate',
            intensity: mapping.intensity,
            duration: mapping.duration,
            pattern: mapping.pattern
          };

          const result = await this.controlDevice(
            userId,
            device.id,
            control,
            triggeredByUserId,
            streamId,
            eventType === 'tip' ? eventValue : undefined
          );

          if (result.success) {
            actionsTriggered++;
          }
        }
        patternsUsed.push(mapping.pattern);
      }

      return { 
        success: actionsTriggered > 0, 
        actionsTriggered,
        patterns: patternsUsed
      };
    } catch (error) {
      console.error(`Error processing event with mappings for user ${userId}:`, error);
      return { success: false, actionsTriggered: 0, patterns: [] };
    }
  }

  /**
   * Enhanced Pattern Controls: Get available patterns
   */
  getAvailablePatterns(): Array<{ name: string; description: string; example: string }> {
    return [
      { name: 'vibrate_pulse', description: 'Pulsing vibration', example: 'Vibrate:10;Pause:1;Vibrate:10;' },
      { name: 'vibrate_wave', description: 'Wave-like vibration', example: 'Vibrate:5;Vibrate:10;Vibrate:15;Vibrate:10;Vibrate:5;' },
      { name: 'vibrate_burst', description: 'Quick burst pattern', example: 'Vibrate:20;Pause:0.5;Vibrate:20;Pause:0.5;Vibrate:20;' },
      { name: 'rotate_slow', description: 'Slow rotation', example: 'Rotate:5;' },
      { name: 'rotate_fast', description: 'Fast rotation', example: 'Rotate:15;' },
      { name: 'combination', description: 'Vibrate and rotate combo', example: 'Vibrate:10;Rotate:8;' }
    ];
  }

  // ====================================
  // PRIVATE HELPER METHODS
  // ====================================

  /**
   * Hash token for secure storage using SHA-256
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate and consume pairing token atomically
   */
  private async validateAndConsumePairingToken(userId: string, token: string): Promise<boolean> {
    try {
      const account = await storage.getLovenseAccount(userId);
      if (!account) {
        return false;
      }

      // Check if token has already been consumed
      if (!account.qrCodeData?.tokenHash) {
        return false;
      }

      // Verify token hasn't expired
      if (account.tokenExpiry && new Date() > account.tokenExpiry) {
        // Clear expired token
        await storage.updateLovenseAccount(userId, {
          qrCodeData: { ...account.qrCodeData, tokenHash: null },
          tokenExpiry: null
        });
        return false;
      }

      // Verify token hash matches
      const expectedHash = account.qrCodeData.tokenHash;
      const providedHash = this.hashToken(token);
      
      if (expectedHash !== providedHash) {
        return false;
      }

      // Atomically clear token to ensure single-use
      await storage.updateLovenseAccount(userId, {
        qrCodeData: { ...account.qrCodeData, tokenHash: null },
        tokenExpiry: null
      });

      return true;
    } catch (error) {
      console.error(`Error validating pairing token for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Validate device data structure
   */
  private validateDeviceData(deviceData: any): boolean {
    if (!deviceData || typeof deviceData !== 'object') {
      return false;
    }
    
    // Basic validation - extend as needed
    const requiredFields = ['id', 'name', 'type'];
    return requiredFields.every(field => 
      deviceData.hasOwnProperty(field) && 
      typeof deviceData[field] === 'string' && 
      deviceData[field].length > 0
    );
  }
}

export const lovenseService = new LovenseService();