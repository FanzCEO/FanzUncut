import { storage } from "../storage";
import type { WebSocketServer, WebSocket } from "ws";

interface NotificationData {
  kind: 'payout' | 'moderation' | 'kyc' | 'system' | 'fan_activity';
  payloadJson: any;
}

class NotificationService {
  private wss: WebSocketServer | null = null;

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  async sendNotification(userId: string, data: NotificationData) {
    try {
      // Store notification in database
      const notification = await storage.createNotification({
        userId,
        kind: data.kind,
        payloadJson: data.payloadJson,
        readAt: null,
      });

      // Send real-time notification via WebSocket
      this.sendRealTimeNotification(userId, notification);

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  async sendSystemNotification(data: NotificationData) {
    // This would typically send to all admin users
    // For now, we'll just log it
    console.log('System notification:', data);
  }

  private sendRealTimeNotification(userId: string, notification: any) {
    if (!this.wss) return;

    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === 1 && (client as any).userId === userId) { // WebSocket.OPEN = 1
        client.send(JSON.stringify({
          type: 'notification',
          data: notification
        }));
      }
    });
  }

  async broadcastToAdmins(message: any) {
    if (!this.wss) return;

    // In a real implementation, we'd maintain a list of admin connections
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === 1) { // WebSocket.OPEN = 1
        client.send(JSON.stringify({
          type: 'admin_broadcast',
          data: message
        }));
      }
    });
  }
}

export const notificationService = new NotificationService();
