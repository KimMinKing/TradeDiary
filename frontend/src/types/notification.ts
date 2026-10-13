// [파일 용도] 알림 관련 타입 정의

export enum NotificationType {
  TRADE_EXECUTED = 'TRADE_EXECUTED',
  POSITION_OPENED = 'POSITION_OPENED',
  POSITION_CLOSED = 'POSITION_CLOSED',
  PROFIT_TAKEN = 'PROFIT_TAKEN',
  LOSS_CUT = 'LOSS_CUT',
  EXCHANGE_CONNECTED = 'EXCHANGE_CONNECTED',
  EXCHANGE_DISCONNECTED = 'EXCHANGE_DISCONNECTED',
  MARGIN_WARNING = 'MARGIN_WARNING',
  DAILY_SUMMARY = 'DAILY_SUMMARY',
  WEEKLY_SUMMARY = 'WEEKLY_SUMMARY',
  MONTHLY_SUMMARY = 'MONTHLY_SUMMARY',
  AI_REPORT_READY = 'AI_REPORT_READY',
  NEWS_ALERT = 'NEWS_ALERT',
  SYSTEM_ALERT = 'SYSTEM_ALERT'
}

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  symbol: string;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
}

export interface NotificationResponse {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  symbol: string;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
}

export interface NotificationCountResponse {
  count: number;
}