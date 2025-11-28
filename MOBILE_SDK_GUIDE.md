# ClubCentral Mobile SDK Integration Guide 📱

## Overview
ClubCentral is the official mobile app for the FANZ Unlimited Network, providing access to BoyFanz, GirlFanz, PupFanz, TransFanz, and TabooFanz platforms through a unified mobile experience.

This guide covers the complete mobile backend API and integration patterns for iOS and Android development.

## 🚀 Getting Started

### Base Configuration
```javascript
const FANZ_CONFIG = {
  baseUrl: 'https://api.boyfanz.com/api/mobile', // Production
  // baseUrl: 'http://localhost:5000/api/mobile', // Development
  timeout: 30000,
  retryAttempts: 3,
  version: '1.0.0'
};
```

### Environment Setup
```bash
# Production URLs
API_BASE_URL=https://api.boyfanz.com/api
WS_BASE_URL=wss://api.boyfanz.com

# Development URLs  
API_BASE_URL=http://localhost:5000/api
WS_BASE_URL=ws://localhost:3001
```

## 🔐 Authentication Flow

### 1. Login
```typescript
interface LoginRequest {
  email: string;
  password: string;
  deviceId: string; // Unique device identifier
  platform: 'ios' | 'android';
  appVersion: string;
  pushToken?: string; // FCM/APNS token
}

interface LoginResponse {
  success: boolean;
  data: {
    user: UserProfile;
    token: string;        // JWT access token
    refreshToken: string; // Refresh token
    expiresAt: string;    // ISO timestamp
  };
}

// Example usage
const loginUser = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch(`${FANZ_CONFIG.baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return response.json();
};
```

### 2. Token Refresh
```typescript
interface RefreshRequest {
  refreshToken: string;
  deviceId: string;
}

const refreshToken = async (data: RefreshRequest): Promise<LoginResponse> => {
  const response = await fetch(`${FANZ_CONFIG.baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};
```

### 3. Logout
```typescript
interface LogoutRequest {
  refreshToken: string;
  deviceId: string;
  userId: string;
}

const logoutUser = async (data: LogoutRequest): Promise<void> => {
  await fetch(`${FANZ_CONFIG.baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};
```

## 👤 User Profile & Preferences

### Get User Profile
```typescript
interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  platforms: string[]; // ['boyfanz', 'girlfanz', etc.]
  verified: boolean;
  createdAt: string;
  lastActive: string;
}

const getUserProfile = async (userId: string, token: string): Promise<UserProfile> => {
  const response = await fetch(`${FANZ_CONFIG.baseUrl}/profile/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result.data;
};
```

### Update User Preferences
```typescript
interface UserPreferences {
  pushNotifications: {
    enabled: boolean;
    types: string[];
    quietHours?: {
      enabled: boolean;
      start: string; // "22:00"
      end: string;   // "08:00"
    };
  };
  privacy: {
    showOnlineStatus: boolean;
    allowDirectMessages: boolean;
    showLastSeen: boolean;
  };
  content: {
    autoplay: boolean;
    dataUsage: 'low' | 'medium' | 'high';
    downloadQuality: 'low' | 'medium' | 'high';
    cacheSize: number; // MB
  };
  theme: {
    darkMode: boolean;
    accentColor: string;
  };
}

const updatePreferences = async (
  userId: string, 
  preferences: Partial<UserPreferences>, 
  token: string
): Promise<UserPreferences> => {
  const response = await fetch(`${FANZ_CONFIG.baseUrl}/profile/${userId}/preferences`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preferences)
  });
  const result = await response.json();
  return result.data;
};
```

## 🔔 Push Notifications

### Register Push Token
```typescript
interface DeviceRegistration {
  userId: string;
  deviceId: string;
  pushToken: string;
  platform: 'ios' | 'android';
  appVersion: string;
}

const registerPushToken = async (data: DeviceRegistration, token: string): Promise<void> => {
  await fetch(`${FANZ_CONFIG.baseUrl}/notifications/register`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
};
```

### Send Test Notification
```typescript
interface TestNotification {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

const sendTestNotification = async (notification: TestNotification, token: string): Promise<void> => {
  await fetch(`${FANZ_CONFIG.baseUrl}/notifications/test`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(notification)
  });
};
```

### Get Notification History
```typescript
interface NotificationHistory {
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    data: Record<string, any>;
    read: boolean;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const getNotificationHistory = async (
  userId: string, 
  page: number = 1, 
  limit: number = 20,
  token: string
): Promise<NotificationHistory> => {
  const response = await fetch(
    `${FANZ_CONFIG.baseUrl}/notifications/${userId}/history?page=${page}&limit=${limit}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const result = await response.json();
  return result.data;
};
```

## 📱 Content & Feed

### Get Personalized Feed
```typescript
interface ContentFeed {
  posts: Array<{
    id: string;
    type: 'photo' | 'video' | 'story' | 'live';
    creator: {
      id: string;
      username: string;
      avatar: string;
      verified: boolean;
    };
    content: {
      url: string;
      thumbnailUrl: string;
      duration?: number; // For videos
      aspectRatio: number;
    };
    metadata: {
      title?: string;
      description?: string;
      tags: string[];
      likes: number;
      comments: number;
      views: number;
    };
    createdAt: string;
    platform: string; // 'boyfanz', 'girlfanz', etc.
  }>;
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

const getContentFeed = async (
  userId: string,
  page: number = 1,
  limit: number = 20,
  contentType?: string,
  token: string
): Promise<ContentFeed> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(contentType && { type: contentType })
  });

  const response = await fetch(
    `${FANZ_CONFIG.baseUrl}/content/feed/${userId}?${params}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const result = await response.json();
  return result.data;
};
```

### Get Optimized Assets
```typescript
interface OptimizedAsset {
  assetId: string;
  urls: {
    original: string;
    optimized: string;
    thumbnail: string;
    preview?: string;
  };
  formats: {
    webp?: string;
    jpeg?: string;
    mp4?: string;
    hls?: string;
  };
  metadata: {
    width: number;
    height: number;
    size: number; // bytes
    duration?: number; // For videos
  };
}

const getOptimizedAssets = async (
  assetId: string,
  quality: 'low' | 'medium' | 'high' = 'medium',
  format: string = 'webp',
  token: string
): Promise<OptimizedAsset> => {
  const params = new URLSearchParams({
    assetId,
    quality,
    format
  });

  const response = await fetch(
    `${FANZ_CONFIG.baseUrl}/assets/optimized?${params}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const result = await response.json();
  return result.data;
};
```

## 🔄 Real-Time Sync

### Get Sync Data
```typescript
interface SyncData {
  lastSyncAt: string;
  changes: Array<{
    type: string; // 'messages', 'content', 'profile', etc.
    operation: 'create' | 'update' | 'delete';
    id: string;
    data: Record<string, any>;
    timestamp: string;
  }>;
  conflicts?: Array<{
    type: string;
    id: string;
    serverData: Record<string, any>;
    clientData: Record<string, any>;
    timestamp: string;
  }>;
}

const getSyncData = async (
  userId: string,
  since?: Date,
  types?: string[],
  token: string
): Promise<SyncData> => {
  const params = new URLSearchParams();
  if (since) params.set('since', since.toISOString());
  if (types) params.set('types', types.join(','));

  const response = await fetch(
    `${FANZ_CONFIG.baseUrl}/sync/${userId}?${params}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const result = await response.json();
  return result.data;
};
```

### Push Sync Changes
```typescript
interface SyncChange {
  type: string;
  id: string;
  operation: 'create' | 'update' | 'delete';
  data?: Record<string, any>;
  timestamp: string;
}

const pushSyncChanges = async (
  userId: string,
  changes: SyncChange[],
  deviceId: string,
  token: string
): Promise<SyncData> => {
  const response = await fetch(`${FANZ_CONFIG.baseUrl}/sync/${userId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ changes, deviceId })
  });
  const result = await response.json();
  return result.data;
};
```

## 📦 Offline Support

### Generate Offline Package
```typescript
interface OfflinePackage {
  packageId: string;
  userId: string;
  types: string[];
  data: {
    messages: Array<any>;
    content: Array<any>;
    profile: Record<string, any>;
    contacts: Array<any>;
  };
  metadata: {
    generatedAt: string;
    expiresAt: string;
    size: number; // bytes
    version: string;
  };
  assets: Array<{
    id: string;
    url: string;
    localPath?: string;
    downloaded: boolean;
  }>;
}

const generateOfflinePackage = async (
  userId: string,
  types: string[] = ['messages', 'content', 'profile'],
  size: 'small' | 'medium' | 'large' = 'medium',
  token: string
): Promise<OfflinePackage> => {
  const params = new URLSearchParams({
    types: types.join(','),
    size
  });

  const response = await fetch(
    `${FANZ_CONFIG.baseUrl}/offline/${userId}/package?${params}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const result = await response.json();
  return result.data;
};
```

## 🔧 Device Management

### Get User Devices
```typescript
interface UserDevice {
  deviceId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  pushToken?: string;
  lastActive: string;
  location?: {
    country: string;
    city: string;
  };
  current: boolean; // Is this the current device
}

const getUserDevices = async (userId: string, token: string): Promise<UserDevice[]> => {
  const response = await fetch(`${FANZ_CONFIG.baseUrl}/devices/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result.data;
};
```

### Remove Device
```typescript
const removeDevice = async (deviceId: string, token: string): Promise<void> => {
  await fetch(`${FANZ_CONFIG.baseUrl}/devices/${deviceId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
};
```

## ⚙️ App Configuration

### Get App Configuration
```typescript
interface AppConfig {
  app: {
    minVersion: string;
    latestVersion: string;
    forceUpdate: boolean;
    maintenance: boolean;
  };
  features: {
    pushNotifications: boolean;
    realTimeSync: boolean;
    offlineMode: boolean;
    biometricAuth: boolean;
    faceId: boolean;
    fingerprint: boolean;
  };
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    rateLimit: {
      maxRequests: number;
      windowMs: number;
    };
  };
  content: {
    maxCacheSize: number;
    preloadImages: boolean;
    autoplayVideos: boolean;
    downloadWifi: boolean;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    darkMode: boolean;
    animations: boolean;
  };
  security: {
    sessionTimeout: number;
    biometricTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  platforms: {
    boyfanz: { enabled: boolean; baseUrl: string };
    girlfanz: { enabled: boolean; baseUrl: string };
    pupfanz: { enabled: boolean; baseUrl: string };
    transfanz: { enabled: boolean; baseUrl: string };
    taboofanz: { enabled: boolean; baseUrl: string };
  };
}

const getAppConfig = async (
  version?: string,
  platform?: 'ios' | 'android'
): Promise<AppConfig> => {
  const params = new URLSearchParams();
  if (version) params.set('version', version);
  if (platform) params.set('platform', platform);

  const response = await fetch(`${FANZ_CONFIG.baseUrl}/config?${params}`);
  const result = await response.json();
  return result.data;
};
```

## 🌐 WebSocket Integration

### Connection Setup
```typescript
interface WebSocketInfo {
  endpoint: string;
  protocols: string[];
  authentication: {
    type: 'jwt';
    header: string;
  };
  heartbeat: {
    interval: number;
    timeout: number;
  };
  reconnect: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  events: string[];
}

const getWebSocketInfo = async (userId: string, token: string): Promise<WebSocketInfo> => {
  const response = await fetch(`${FANZ_CONFIG.baseUrl}/websocket/${userId}/info`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result.data;
};

// WebSocket connection example
class FanzWebSocket {
  private ws: WebSocket | null = null;
  private token: string;
  private userId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(token: string, userId: string) {
    this.token = token;
    this.userId = userId;
  }

  async connect(): Promise<void> {
    const wsInfo = await getWebSocketInfo(this.userId, this.token);
    
    this.ws = new WebSocket(wsInfo.endpoint, wsInfo.protocols);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.authenticate();
      this.startHeartbeat(wsInfo.heartbeat);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private authenticate(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'auth',
        token: this.token
      }));
    }
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'user.online':
        // Handle user online event
        break;
      case 'message.new':
        // Handle new message
        break;
      case 'notification.push':
        // Handle push notification
        break;
      case 'sync.required':
        // Trigger sync
        break;
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.pow(1.5, this.reconnectAttempts) * 1000;
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    }
  }

  private startHeartbeat(config: { interval: number; timeout: number }): void {
    setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, config.interval);
  }

  disconnect(): void {
    this.ws?.close();
  }
}
```

## 📊 Health & Analytics

### Health Check
```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    pushNotifications: 'up' | 'down';
    realTimeSync: 'up' | 'down';
    contentDelivery: 'up' | 'down';
    database: 'up' | 'down';
  };
  performance: {
    responseTime: number;
    uptime: number;
    activeConnections: number;
  };
  timestamp: string;
}

const getHealthStatus = async (): Promise<HealthStatus> => {
  const response = await fetch(`${FANZ_CONFIG.baseUrl}/health`);
  const result = await response.json();
  return result.data;
};
```

### Analytics
```typescript
interface MobileAnalytics {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  devices: {
    ios: number;
    android: number;
    total: number;
  };
  engagement: {
    avgSessionDuration: number; // seconds
    dailySessions: number;
    pushOpenRate: number;
    retentionRate: number;
  };
  performance: {
    avgLoadTime: number; // seconds
    crashRate: number;
    apiResponseTime: number; // ms
    offlineUsage: number;
  };
  content: {
    totalViews: number;
    totalDownloads: number;
    cacheHitRate: number;
    bandwidthSaved: number; // GB
  };
}

const getMobileAnalytics = async (
  startDate?: string,
  endDate?: string
): Promise<MobileAnalytics> => {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const response = await fetch(`${FANZ_CONFIG.baseUrl}/analytics?${params}`);
  const result = await response.json();
  return result.data;
};
```

## 🛡️ Security Best Practices

### Token Management
```typescript
class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: Date | null = null;

  setTokens(tokens: { token: string; refreshToken: string; expiresAt: string }): void {
    this.accessToken = tokens.token;
    this.refreshToken = tokens.refreshToken;
    this.expiresAt = new Date(tokens.expiresAt);
    
    // Store securely (Keychain/Android Keystore)
    this.secureStore('accessToken', tokens.token);
    this.secureStore('refreshToken', tokens.refreshToken);
  }

  async getValidToken(): Promise<string | null> {
    if (!this.accessToken || !this.expiresAt) {
      return null;
    }

    // Check if token expires within 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() + fiveMinutes >= this.expiresAt.getTime()) {
      await this.refreshTokens();
    }

    return this.accessToken;
  }

  private async refreshTokens(): Promise<void> {
    if (!this.refreshToken) throw new Error('No refresh token available');

    const result = await refreshToken({
      refreshToken: this.refreshToken,
      deviceId: this.getDeviceId()
    });

    if (result.success) {
      this.setTokens(result.data);
    } else {
      // Refresh failed, redirect to login
      this.clearTokens();
      throw new Error('Token refresh failed');
    }
  }

  private secureStore(key: string, value: string): void {
    // iOS: Use Keychain Services
    // Android: Use Android Keystore
    // React Native: Use react-native-keychain
  }

  private getDeviceId(): string {
    // Return unique device identifier
    // iOS: Use identifierForVendor
    // Android: Use Android ID or Firebase Installation ID
    return '';
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
    // Clear from secure storage
  }
}
```

### Request Interceptor
```typescript
class APIClient {
  private tokenManager: TokenManager;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.tokenManager = new TokenManager();
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.tokenManager.getValidToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    };

    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, config);
        
        if (response.status === 401) {
          // Token expired, try refresh
          await this.tokenManager.refreshTokens();
          const newToken = await this.tokenManager.getValidToken();
          if (newToken) {
            config.headers = {
              ...config.headers,
              'Authorization': `Bearer ${newToken}`
            };
            attempt++;
            continue;
          } else {
            throw new Error('Authentication failed');
          }
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) throw error;
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    throw new Error('Max retries exceeded');
  }
}
```

## 📱 Platform-Specific Implementations

### iOS (Swift)
```swift
import Foundation

class FanzAPIClient {
    private let baseURL = "https://api.boyfanz.com/api/mobile"
    private let tokenManager = TokenManager()
    
    func login(credentials: LoginCredentials) async throws -> LoginResponse {
        let request = URLRequest(url: URL(string: "\(baseURL)/auth/login")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(credentials)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.unauthorized
        }
        
        let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)
        tokenManager.setTokens(loginResponse.data)
        
        return loginResponse
    }
}
```

### Android (Kotlin)
```kotlin
import retrofit2.http.*
import okhttp3.Interceptor
import okhttp3.Response

interface FanzAPI {
    @POST("auth/login")
    suspend FANZ login(@Body credentials: LoginRequest): LoginResponse
    
    @GET("profile/{userId}")
    suspend FANZ getUserProfile(@Path("userId") userId: String): ProfileResponse
    
    @PUT("profile/{userId}/preferences")
    suspend FANZ updatePreferences(
        @Path("userId") userId: String,
        @Body preferences: UserPreferences
    ): PreferencesResponse
}

class TokenInterceptor(private val tokenManager: TokenManager) : Interceptor {
    override FANZ intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val token = tokenManager.getValidToken()
        
        val newRequest = originalRequest.newBuilder()
            .apply {
                if (token != null) {
                    header("Authorization", "Bearer $token")
                }
            }
            .build()
            
        val response = chain.proceed(newRequest)
        
        if (response.code == 401) {
            // Handle token refresh
            val refreshedToken = tokenManager.refreshToken()
            if (refreshedToken != null) {
                val retryRequest = originalRequest.newBuilder()
                    .header("Authorization", "Bearer $refreshedToken")
                    .build()
                return chain.proceed(retryRequest)
            }
        }
        
        return response
    }
}
```

## 🚀 Getting Started Checklist

### For Developers
- [ ] Set up base API configuration
- [ ] Implement authentication flow
- [ ] Add token management with secure storage
- [ ] Implement request interceptor with retry logic
- [ ] Set up push notification handling
- [ ] Add offline data synchronization
- [ ] Implement WebSocket for real-time features
- [ ] Add error handling and user feedback
- [ ] Test on both iOS and Android platforms
- [ ] Implement biometric authentication
- [ ] Add analytics tracking
- [ ] Test offline mode functionality

### For Production
- [ ] Configure production API endpoints
- [ ] Set up proper SSL certificate validation
- [ ] Implement certificate pinning
- [ ] Add crash reporting (Crashlytics/Bugsnag)
- [ ] Set up analytics (Firebase Analytics/Mixpanel)
- [ ] Configure push notification certificates
- [ ] Test with production data
- [ ] Perform security audit
- [ ] Load test API endpoints
- [ ] Set up monitoring and alerting

---

## 📞 Support & Resources

- **API Documentation**: [https://docs.boyfanz.com/mobile](https://docs.boyfanz.com/mobile)
- **Developer Portal**: [https://developers.boyfanz.com](https://developers.boyfanz.com)
- **Status Page**: [https://status.boyfanz.com](https://status.boyfanz.com)
- **Support Email**: developers@boyfanz.com
- **Discord**: [https://discord.gg/fanz-dev](https://discord.gg/fanz-dev)

**SDK Version**: 1.0.0  
**Last Updated**: 2024-12-26  
**Platforms Supported**: iOS 13+, Android API 21+