// BoyFanz PWA Utilities
// Handles PWA installation, push subscriptions, and offline functionality

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PushSubscriptionOptions {
  userVisibleOnly: boolean;
  applicationServerKey: string | Uint8Array;
}

class BoyFanzPWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private pushSubscription: PushSubscription | null = null;
  
  // VAPID public key for push notifications
  private readonly vapidPublicKey = 'BP1_YOUR_VAPID_PUBLIC_KEY_HERE_REPLACE_WITH_ACTUAL';
  
  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    try {
      // Register service worker
      await this.registerServiceWorker();
      
      // Setup installation prompt handling
      this.setupInstallPrompt();
      
      // Initialize push notifications
      await this.initializePushNotifications();
      
      // Setup offline/online event handlers
      this.setupNetworkHandlers();
      
      // Setup app badge support
      this.setupAppBadge();
      
      console.log('🚀 BoyFanz PWA Manager initialized successfully');
    } catch (error) {
      console.error('❌ PWA Manager initialization failed:', error);
    }
  }

  // Service Worker Registration
  async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ Service Worker registered:', this.swRegistration.scope);
      
      // Listen for service worker updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.notifyUserOfUpdate();
            }
          });
        }
      });

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      throw error;
    }
  }

  // PWA Installation Management
  setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      
      // Show custom install prompt
      this.showInstallBanner();
      
      console.log('📱 PWA install prompt ready');
    });

    // Track successful installation
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA installed successfully');
      this.trackInstallation('manual');
      this.deferredPrompt = null;
    });
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('❌ No install prompt available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      
      console.log('👤 User install choice:', choice.outcome);
      
      if (choice.outcome === 'accepted') {
        this.trackInstallation('prompt');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Install prompt failed:', error);
      return false;
    } finally {
      this.deferredPrompt = null;
    }
  }

  // Push Notifications Management
  async initializePushNotifications(): Promise<void> {
    if (!this.swRegistration) {
      console.log('⚠️ Service Worker not registered, skipping push notifications');
      return;
    }

    if (!('PushManager' in window)) {
      console.log('⚠️ Push notifications not supported');
      return;
    }

    try {
      // Check current subscription
      this.pushSubscription = await this.swRegistration.pushManager.getSubscription();
      
      if (this.pushSubscription) {
        console.log('✅ Existing push subscription found');
        await this.syncPushSubscription();
      }
    } catch (error) {
      console.error('❌ Push notification initialization failed:', error);
    }
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    console.log('🔔 Notification permission:', permission);
    return permission;
  }

  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      throw new Error('Service Worker not registered');
    }

    const permission = await this.requestNotificationPermission();
    
    if (permission !== 'granted') {
      console.log('❌ Notification permission denied');
      return null;
    }

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      } as PushSubscriptionOptions);

      console.log('✅ Push subscription created:', subscription);
      
      // Send subscription to server
      await this.syncPushSubscription(subscription);
      
      this.pushSubscription = subscription;
      return subscription;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      throw error;
    }
  }

  async unsubscribeFromPushNotifications(): Promise<boolean> {
    if (!this.pushSubscription) {
      return true;
    }

    try {
      const success = await this.pushSubscription.unsubscribe();
      
      if (success) {
        // Notify server about unsubscription
        await this.removePushSubscription();
        this.pushSubscription = null;
        console.log('✅ Push subscription removed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Push unsubscription failed:', error);
      return false;
    }
  }

  // Offline Support
  setupNetworkHandlers(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Back online');
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      console.log('📵 Gone offline');
      this.handleOffline();
    });
  }

  private handleOnline(): void {
    // Trigger background sync
    this.triggerBackgroundSync();
    
    // Update UI
    document.body.classList.remove('offline');
    
    // Show reconnection notification
    this.showNetworkNotification('🌐 You\'re back online!', 'success');
  }

  private handleOffline(): void {
    // Update UI
    document.body.classList.add('offline');
    
    // Show offline notification
    this.showNetworkNotification('📵 You\'re offline. Actions will sync when you reconnect.', 'warning');
  }

  async queueOfflineAction(action: any): Promise<void> {
    if (!this.swRegistration?.active) {
      console.log('⚠️ Service Worker not active, cannot queue action');
      return;
    }

    this.swRegistration.active.postMessage({
      type: 'QUEUE_ACTION',
      payload: action
    });
  }

  private async triggerBackgroundSync(): Promise<void> {
    if (!this.swRegistration?.sync) {
      console.log('⚠️ Background Sync not supported');
      return;
    }

    try {
      await this.swRegistration.sync.register('sync-queued-actions');
      console.log('🔄 Background sync triggered');
    } catch (error) {
      console.error('❌ Background sync failed:', error);
    }
  }

  // App Badge Support
  setupAppBadge(): void {
    if ('setAppBadge' in navigator) {
      console.log('✅ App Badge API supported');
    } else {
      console.log('⚠️ App Badge API not supported');
    }
  }

  async updateAppBadge(count: number): Promise<void> {
    if (!('setAppBadge' in navigator)) {
      return;
    }

    try {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    } catch (error) {
      console.error('❌ App badge update failed:', error);
    }
  }

  // Utility Methods
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private async syncPushSubscription(subscription?: PushSubscription): Promise<void> {
    const sub = subscription || this.pushSubscription;
    if (!sub) return;

    try {
      const response = await fetch('/api/pwa/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
          platform: this.getPlatform()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to sync push subscription');
      }

      console.log('✅ Push subscription synced with server');
    } catch (error) {
      console.error('❌ Failed to sync push subscription:', error);
    }
  }

  private async removePushSubscription(): Promise<void> {
    try {
      await fetch('/api/pwa/push-subscription', {
        method: 'DELETE'
      });
      console.log('✅ Push subscription removed from server');
    } catch (error) {
      console.error('❌ Failed to remove push subscription:', error);
    }
  }

  private showInstallBanner(): void {
    // Create and show custom install banner
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff0000, #cc0000);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(255, 0, 0, 0.3);
        z-index: 10000;
        max-width: 300px;
        font-family: Inter, sans-serif;
        animation: slideIn 0.5s ease-out;
      ">
        <div style="font-weight: 600; margin-bottom: 8px;">
          📱 Install BoyFanz App
        </div>
        <div style="font-size: 14px; margin-bottom: 12px; opacity: 0.9;">
          Get the full app experience with offline support and push notifications.
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="pwa-install-btn" style="
            background: white;
            color: #ff0000;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            flex: 1;
          ">Install</button>
          <button id="pwa-dismiss-btn" style="
            background: transparent;
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
          ">Later</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Add event listeners
    document.getElementById('pwa-install-btn')?.addEventListener('click', () => {
      this.promptInstall();
      banner.remove();
    });

    document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
      banner.remove();
    });

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (banner.parentNode) {
        banner.remove();
      }
    }, 10000);
  }

  private notifyUserOfUpdate(): void {
    // Show update available notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a1a1a;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        border: 1px solid #ff0000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
      ">
        <div style="margin-bottom: 8px; font-weight: 600;">
          🔄 App Update Available
        </div>
        <button onclick="window.location.reload()" style="
          background: #ff0000;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">Update Now</button>
      </div>
    `;
    
    document.body.appendChild(notification);
  }

  private showNetworkNotification(message: string, type: 'success' | 'warning'): void {
    const color = type === 'success' ? '#22c55e' : '#f59e0b';
    
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${color};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: 500;
      ">
        ${message}
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  private trackInstallation(method: string): void {
    // Track installation analytics
    fetch('/api/pwa/installation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method,
        userAgent: navigator.userAgent,
        platform: this.getPlatform(),
        timestamp: new Date().toISOString()
      })
    }).catch(error => {
      console.error('❌ Failed to track installation:', error);
    });
  }

  private getPlatform(): string {
    const userAgent = navigator.userAgent;
    
    if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
    if (/Android/.test(userAgent)) return 'android';
    if (/Windows/.test(userAgent)) return 'windows';
    if (/Mac/.test(userAgent)) return 'macos';
    if (/Linux/.test(userAgent)) return 'linux';
    
    return 'unknown';
  }

  // Public API
  get isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           (window.navigator as any).standalone;
  }

  get isOnline(): boolean {
    return navigator.onLine;
  }

  get canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  get hasNotificationPermission(): boolean {
    return Notification.permission === 'granted';
  }

  get isPushSubscribed(): boolean {
    return this.pushSubscription !== null;
  }
}

// Global PWA Manager instance
export const pwaManager = new BoyFanzPWAManager();

// Export types
export type { BeforeInstallPromptEvent, PushSubscriptionOptions };