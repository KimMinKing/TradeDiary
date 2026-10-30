// [파일 용도] 알림 API 호출 함수
// 공통 api 인스턴스(authApi) 사용 → 토큰 만료 시 RefreshToken 재발급 인터셉터 일원화

import type { NotificationResponse, NotificationCountResponse } from '../types/notification';
import api from './authApi';

export const notificationApi = {
  // 알림 목록 조회
  getNotifications: async (page = 0, size = 20) => {
    const response = await api.get<NotificationResponse[]>(`/api/notifications?page=${page}&size=${size}`);
    return response.data;
  },

  // 알림 목록 무한 스크롤
  getOlderNotifications: async (lastId?: number, page = 0, size = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString()
    });

    if (lastId !== undefined) {
      params.append('lastId', lastId.toString());
    }

    const response = await api.get<NotificationResponse[]>(`/api/notifications/older?${params}`);
    return response.data;
  },

  // 미읽은 알림 수 조회
  // 백엔드 응답이 ApiResponse<Long> 래핑({success, data: <count>, ...}) → 정규화하여 {count} 반환
  getUnreadCount: async (): Promise<NotificationCountResponse> => {
    const response = await api.get('/api/notifications/unread-count');
    return { count: Number(response.data?.data ?? 0) };
  },

  // 미읽은 알림 목록 조회
  getUnreadNotifications: async () => {
    const response = await api.get<NotificationResponse[]>('/api/notifications/unread');
    return response.data;
  },

  // 모든 알림 읽음 처리
  markAllAsRead: async () => {
    await api.post('/api/notifications/mark-all-read');
  },

  // 특정 알림 읽음 처리
  markAsRead: async (notificationId: number) => {
    await api.post(`/api/notifications/${notificationId}/read`);
  },

  // 알림 타입별 조회
  getNotificationsByType: async (type: string, page = 0, size = 20) => {
    const response = await api.get<NotificationResponse[]>(`/api/notifications/type/${type}?page=${page}&size=${size}`);
    return response.data;
  },

  // 알림 심볼별 조회
  getNotificationsBySymbol: async (symbol: string, page = 0, size = 20) => {
    const response = await api.get<NotificationResponse[]>(`/api/notifications/symbol/${symbol}?page=${page}&size=${size}`);
    return response.data;
  },

  // 알림 Delete
  deleteNotification: async (notificationId: number) => {
    await api.delete(`/api/notifications/${notificationId}`);
  },

  deleteAllNotifications: async () => {
    await api.delete('/api/notifications');
  },
};
