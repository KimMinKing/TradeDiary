import { useEffect, useRef, useCallback } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

import { refreshAccessToken } from '../api/authApi';
import { notificationApi } from '../api/notificationApi';
import { getTokenExpirationMs } from '../utils/jwt';
import type { Notification } from '../types/notification';

interface UseNotificationProps {
  userId: number;
  onNotification?: (notification: Notification) => void;
}

const NOTIFICATION_TOPIC = '/user/queue/notifications';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 15000;
const TOKEN_REFRESH_THRESHOLD_MS = 60 * 1000;

export function useNotification({ userId, onNotification }: UseNotificationProps) {
  const stompClientRef = useRef<any>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const connectingRef = useRef(false);
  const disposedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext
        || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state !== 'running') return;

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1175, context.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.23);
    } catch {
      // Browser audio policy can block sound until the first interaction.
    }
  }, []);

  const getUsableAccessToken = useCallback(async () => {
    const currentToken = localStorage.getItem('accessToken');
    const expiresAtMs = getTokenExpirationMs(currentToken);

    if (currentToken && expiresAtMs && expiresAtMs - Date.now() > TOKEN_REFRESH_THRESHOLD_MS) {
      return currentToken;
    }

    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      return null;
    }

    return localStorage.getItem('accessToken');
  }, []);

  const connect = useCallback(async () => {
    if (!userId || disposedRef.current || connectingRef.current || stompClientRef.current?.connected || !navigator.onLine) {
      return;
    }

    connectingRef.current = true;

    const token = await getUsableAccessToken();
    if (!token) {
      connectingRef.current = false;
      console.warn('유효한 accessToken 없음 -> WebSocket 연결 생략');
      return;
    }

    const client = Stomp.over(() => new SockJS(`/ws?token=${encodeURIComponent(token)}`));
    client.debug = () => {};

    client.connect(
      {},
      () => {
        connectingRef.current = false;
        reconnectAttempts.current = 0;
        client.subscribe(NOTIFICATION_TOPIC, (message: any) => {
          try {
            const notif: Notification = JSON.parse(message.body);
            onNotificationRef.current?.(notif);
            playNotificationSound();

            if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(notif.title, {
                body: notif.message,
                icon: '/favicon.ico',
              });
            }
          } catch (err) {
            console.error('STOMP 메시지 파싱 오류:', err);
          }
        });
      },
      () => {
        connectingRef.current = false;
        stompClientRef.current = null;
        if (disposedRef.current) return;
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          const delay = Math.min(
            RECONNECT_DELAY_MS * (2 ** (reconnectAttempts.current - 1)),
            MAX_RECONNECT_DELAY_MS,
          );
          reconnectTimerRef.current = window.setTimeout(() => {
            void connect();
          }, delay);
        } else {
          console.warn('WebSocket 최대 재연결 시도 초과');
        }
      },
    );

    stompClientRef.current = client;
  }, [getUsableAccessToken, playNotificationSound, userId]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    connectingRef.current = false;
    if (!stompClientRef.current) {
      return;
    }

    try {
      stompClientRef.current.disconnect(() => {});
    } catch {
      // ignore
    }

    stompClientRef.current = null;
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await notificationApi.markAsRead(notificationId);
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
    }
  }, []);

  const getUnreadCount = useCallback(async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      return response.count;
    } catch (error) {
      console.error('미읽은 알림 수 조회 실패:', error);
      return 0;
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: number) => {
    try {
      await notificationApi.deleteNotification(notificationId);
    } catch (error) {
      console.error('알림 Delete 실패:', error);
    }
  }, []);

  const deleteAllNotifications = useCallback(async () => {
    try {
      await notificationApi.deleteAllNotifications();
    } catch (error) {
      console.error('알림 All Delete 실패:', error);
    }
  }, []);

  useEffect(() => {
    disposedRef.current = false;

    const unlockAudio = () => {
      const AudioContextClass = window.AudioContext
        || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const context = audioContextRef.current ?? (AudioContextClass ? new AudioContextClass() : null);
      audioContextRef.current = context;
      if (context?.state === 'suspended') void context.resume();
    };
    const reconnect = () => {
      if (!stompClientRef.current?.connected) void connect();
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', reconnect);

    void connect();

    return () => {
      disposedRef.current = true;
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', reconnect);
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectWebSocket: connect,
    disconnectWebSocket: disconnect,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getUnreadCount,
  };
}
