// BoyFanz PWA Offline Storage
// IndexedDB utilities for offline data storage and synchronization

interface StoredMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: number;
  synced: boolean;
  mediaUrl?: string;
  messageType: 'text' | 'image' | 'video' | 'audio';
}

interface StoredProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: number;
  cachedAt: number;
}

interface StoredContent {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string;
  price: number;
  visibility: string;
  timestamp: number;
  cachedAt: number;
  viewCount: number;
}

interface SyncAction {
  id: string;
  type: 'send_message' | 'like_content' | 'follow_user' | 'upload_content' | 'update_profile';
  endpoint: string;
  method: string;
  data: any;
  timestamp: number;
  retryCount: number;
  synced: boolean;
}

interface OfflineSession {
  id: string;
  userId: string;
  startTime: number;
  endTime?: number;
  actions: string[];
  dataUsage: number;
}

class BoyFanzOfflineStorage {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'BoyFanzPWA';
  private readonly dbVersion = 1;

  // Database stores
  private readonly stores = {
    messages: 'messages',
    profiles: 'profiles', 
    content: 'content',
    syncActions: 'sync_actions',
    sessions: 'offline_sessions',
    media: 'cached_media',
    preferences: 'user_preferences'
  };

  constructor() {
    this.initDB();
  }

  // Initialize IndexedDB
  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ IndexedDB initialization failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ BoyFanz IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Messages store
        if (!db.objectStoreNames.contains(this.stores.messages)) {
          const messagesStore = db.createObjectStore(this.stores.messages, { keyPath: 'id' });
          messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
          messagesStore.createIndex('senderId', 'senderId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          messagesStore.createIndex('synced', 'synced', { unique: false });
        }

        // Profiles store
        if (!db.objectStoreNames.contains(this.stores.profiles)) {
          const profilesStore = db.createObjectStore(this.stores.profiles, { keyPath: 'id' });
          profilesStore.createIndex('username', 'username', { unique: false });
          profilesStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Content store
        if (!db.objectStoreNames.contains(this.stores.content)) {
          const contentStore = db.createObjectStore(this.stores.content, { keyPath: 'id' });
          contentStore.createIndex('creatorId', 'creatorId', { unique: false });
          contentStore.createIndex('timestamp', 'timestamp', { unique: false });
          contentStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Sync actions store
        if (!db.objectStoreNames.contains(this.stores.syncActions)) {
          const syncStore = db.createObjectStore(this.stores.syncActions, { keyPath: 'id' });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('synced', 'synced', { unique: false });
        }

        // Sessions store
        if (!db.objectStoreNames.contains(this.stores.sessions)) {
          const sessionsStore = db.createObjectStore(this.stores.sessions, { keyPath: 'id' });
          sessionsStore.createIndex('userId', 'userId', { unique: false });
          sessionsStore.createIndex('startTime', 'startTime', { unique: false });
        }

        // Media cache store
        if (!db.objectStoreNames.contains(this.stores.media)) {
          const mediaStore = db.createObjectStore(this.stores.media, { keyPath: 'url' });
          mediaStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          mediaStore.createIndex('size', 'size', { unique: false });
        }

        // Preferences store
        if (!db.objectStoreNames.contains(this.stores.preferences)) {
          db.createObjectStore(this.stores.preferences, { keyPath: 'key' });
        }

        console.log('🔧 IndexedDB schema updated');
      };
    });
  }

  // ===== MESSAGES STORAGE =====

  async storeMessage(message: StoredMessage): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.messages], 'readwrite');
    const store = transaction.objectStore(this.stores.messages);
    
    await store.put(message);
    console.log('💬 Message cached offline:', message.id);
  }

  async getMessages(conversationId: string, limit = 50): Promise<StoredMessage[]> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.messages], 'readonly');
    const store = transaction.objectStore(this.stores.messages);
    const index = store.index('conversationId');
    
    return new Promise((resolve, reject) => {
      const messages: StoredMessage[] = [];
      const request = index.openCursor(IDBKeyRange.only(conversationId), 'prev');
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && messages.length < limit) {
          messages.push(cursor.value);
          cursor.continue();
        } else {
          resolve(messages);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async getUnsyncedMessages(): Promise<StoredMessage[]> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.messages], 'readonly');
    const store = transaction.objectStore(this.stores.messages);
    const index = store.index('synced');
    
    return new Promise((resolve, reject) => {
      const messages: StoredMessage[] = [];
      const request = index.openCursor(IDBKeyRange.only(false));
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          messages.push(cursor.value);
          cursor.continue();
        } else {
          resolve(messages);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async markMessageSynced(messageId: string): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.messages], 'readwrite');
    const store = transaction.objectStore(this.stores.messages);
    
    const message = await store.get(messageId);
    if (message) {
      message.synced = true;
      await store.put(message);
    }
  }

  // ===== PROFILES STORAGE =====

  async storeProfile(profile: StoredProfile): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.profiles], 'readwrite');
    const store = transaction.objectStore(this.stores.profiles);
    
    profile.cachedAt = Date.now();
    await store.put(profile);
    console.log('👤 Profile cached offline:', profile.username);
  }

  async getProfile(userId: string): Promise<StoredProfile | null> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.profiles], 'readonly');
    const store = transaction.objectStore(this.stores.profiles);
    
    return await store.get(userId) || null;
  }

  async getRecentProfiles(limit = 20): Promise<StoredProfile[]> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.profiles], 'readonly');
    const store = transaction.objectStore(this.stores.profiles);
    const index = store.index('cachedAt');
    
    return new Promise((resolve, reject) => {
      const profiles: StoredProfile[] = [];
      const request = index.openCursor(null, 'prev');
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && profiles.length < limit) {
          profiles.push(cursor.value);
          cursor.continue();
        } else {
          resolve(profiles);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // ===== CONTENT STORAGE =====

  async storeContent(content: StoredContent): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.content], 'readwrite');
    const store = transaction.objectStore(this.stores.content);
    
    content.cachedAt = Date.now();
    await store.put(content);
    console.log('📱 Content cached offline:', content.id);
  }

  async getContentFeed(limit = 20): Promise<StoredContent[]> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.content], 'readonly');
    const store = transaction.objectStore(this.stores.content);
    const index = store.index('timestamp');
    
    return new Promise((resolve, reject) => {
      const content: StoredContent[] = [];
      const request = index.openCursor(null, 'prev');
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && content.length < limit) {
          content.push(cursor.value);
          cursor.continue();
        } else {
          resolve(content);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async getCreatorContent(creatorId: string, limit = 10): Promise<StoredContent[]> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.content], 'readonly');
    const store = transaction.objectStore(this.stores.content);
    const index = store.index('creatorId');
    
    return new Promise((resolve, reject) => {
      const content: StoredContent[] = [];
      const request = index.openCursor(IDBKeyRange.only(creatorId), 'prev');
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && content.length < limit) {
          content.push(cursor.value);
          cursor.continue();
        } else {
          resolve(content);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // ===== SYNC ACTIONS MANAGEMENT =====

  async queueAction(action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount' | 'synced'>): Promise<string> {
    if (!this.db) await this.initDB();
    
    const syncAction: SyncAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      synced: false
    };
    
    const transaction = this.db!.transaction([this.stores.syncActions], 'readwrite');
    const store = transaction.objectStore(this.stores.syncActions);
    
    await store.put(syncAction);
    console.log('📥 Action queued for sync:', syncAction.type, syncAction.id);
    
    return syncAction.id;
  }

  async getPendingActions(): Promise<SyncAction[]> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.syncActions], 'readonly');
    const store = transaction.objectStore(this.stores.syncActions);
    const index = store.index('synced');
    
    return new Promise((resolve, reject) => {
      const actions: SyncAction[] = [];
      const request = index.openCursor(IDBKeyRange.only(false));
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          actions.push(cursor.value);
          cursor.continue();
        } else {
          resolve(actions.sort((a, b) => a.timestamp - b.timestamp));
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async markActionSynced(actionId: string): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.syncActions], 'readwrite');
    const store = transaction.objectStore(this.stores.syncActions);
    
    const action = await store.get(actionId);
    if (action) {
      action.synced = true;
      await store.put(action);
      console.log('✅ Action synced:', actionId);
    }
  }

  async incrementActionRetry(actionId: string): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.syncActions], 'readwrite');
    const store = transaction.objectStore(this.stores.syncActions);
    
    const action = await store.get(actionId);
    if (action) {
      action.retryCount++;
      await store.put(action);
    }
  }

  // ===== MEDIA CACHING =====

  async cacheMedia(url: string, blob: Blob): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.media], 'readwrite');
    const store = transaction.objectStore(this.stores.media);
    
    const mediaData = {
      url,
      blob,
      size: blob.size,
      type: blob.type,
      cachedAt: Date.now()
    };
    
    await store.put(mediaData);
    console.log('🖼️ Media cached:', url);
  }

  async getCachedMedia(url: string): Promise<Blob | null> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.media], 'readonly');
    const store = transaction.objectStore(this.stores.media);
    
    const result = await store.get(url);
    return result?.blob || null;
  }

  // ===== PREFERENCES & SETTINGS =====

  async setPreference(key: string, value: any): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.preferences], 'readwrite');
    const store = transaction.objectStore(this.stores.preferences);
    
    await store.put({ key, value, updatedAt: Date.now() });
  }

  async getPreference(key: string, defaultValue: any = null): Promise<any> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction([this.stores.preferences], 'readonly');
    const store = transaction.objectStore(this.stores.preferences);
    
    const result = await store.get(key);
    return result?.value ?? defaultValue;
  }

  // ===== STORAGE MANAGEMENT =====

  async getStorageInfo(): Promise<{
    used: number;
    available: number;
    total: number;
    percentUsed: number;
  }> {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const total = estimate.quota || 0;
      const available = total - used;
      const percentUsed = total > 0 ? (used / total) * 100 : 0;
      
      return { used, available, total, percentUsed };
    } catch {
      return { used: 0, available: 0, total: 0, percentUsed: 0 };
    }
  }

  async clearOldData(): Promise<void> {
    if (!this.db) await this.initDB();
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Clear old cached content
    const contentTransaction = this.db!.transaction([this.stores.content], 'readwrite');
    const contentStore = contentTransaction.objectStore(this.stores.content);
    const contentIndex = contentStore.index('cachedAt');
    
    contentIndex.openCursor(IDBKeyRange.upperBound(oneWeekAgo)).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    // Clear old media cache
    const mediaTransaction = this.db!.transaction([this.stores.media], 'readwrite');
    const mediaStore = mediaTransaction.objectStore(this.stores.media);
    const mediaIndex = mediaStore.index('cachedAt');
    
    mediaIndex.openCursor(IDBKeyRange.upperBound(oneWeekAgo)).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    console.log('🧹 Old offline data cleared');
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.initDB();
    
    const storeNames = Object.values(this.stores);
    const transaction = this.db!.transaction(storeNames, 'readwrite');
    
    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      await store.clear();
    }
    
    console.log('🗑️ All offline data cleared');
  }
}

// Global offline storage instance
export const offlineStorage = new BoyFanzOfflineStorage();

// Export types
export type { 
  StoredMessage, 
  StoredProfile, 
  StoredContent, 
  SyncAction, 
  OfflineSession 
};