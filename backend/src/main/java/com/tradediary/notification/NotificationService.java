// [파일 용도] 알림 비즈니스 로직 처리 서비스

package com.tradediary.notification;

import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDateTime;

// [클래스] 알림 생성, 조회, 관리 서비스
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // [용도] 알림 생성 및 WebSocket 전송 / [호출] TradeService, PositionService 등에서 호출
    @Transactional
    public Notification createNotification(Long userId, NotificationType type, String title,
                                         String message, String symbol, String relatedId) {
        if (relatedId != null) {
            var existing = notificationRepository.findByUserIdAndRelatedId(userId, relatedId);
            if (existing.isPresent()) return existing.get();
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        NotificationType persistedType = normalizeTypeForPersistence(type);

        Notification notification = Notification.builder()
                .user(user)
                .type(persistedType)
                .title(title)
                .message(message)
                .symbol(symbol)
                .relatedId(relatedId)
                .build();

        notification = notificationRepository.save(notification);

        // WebSocket으로 실시간 알림 전송
        sendNotificationToUser(userId, convertToResponse(notification));

        return notification;
    }

    // [용도] 특정 사용자에게 알림 WebSocket 전송 / [호출] createNotification()
    // STOMP 핸드셰이크 시 HandshakeInterceptor 가 Principal(userId) 주입 →
    // convertAndSendToUser 가 해당 Principal 세션을 찾아 /user/{userId}/queue/notifications 로 전송
    public void sendNotificationToUser(Long userId, NotificationResponse notification) {
        try {
            messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/notifications",
                notification
            );
        } catch (RuntimeException e) {
            log.warn("[Notification] WebSocket 알림 전송 실패 - userId={}, notificationId={}",
                    userId, notification.getId(), e);
        }
    }

    // [용도] 사용자 알림 목록 조회 / [호출] NotificationController.getNotifications()
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId, pageable)
                .map(this::convertToResponse);
    }

    // [용도] 미읽은 알림 수 조회 / [호출] NotificationController.getUnreadCount()
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsRead(userId, false);
    }

    // [용도] 미읽은 알림 목록 조회 / [호출] NotificationController.getUnreadNotifications()
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadOrderByCreatedAtDescIdDesc(userId, false)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    // [용도] 모든 알림 읽음 처리 / [호출] NotificationController.markAllAsRead()
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    // [용도] 특정 알림 읽음 처리 / [호출] NotificationController.markNotificationAsRead()
    @Transactional
    public void markNotificationAsRead(Long userId, Long notificationId) {
        notificationRepository.markAsReadByIdAndUserId(notificationId, userId);
    }

    // [용도] 알림 타입별 조회 / [호출] NotificationController.getNotificationsByType()
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotificationsByType(Long userId,
                                                         NotificationType type,
                                                         Pageable pageable) {
        return notificationRepository.findByUserIdAndType(userId, type, pageable)
                .map(this::convertToResponse);
    }

    // [용도] 심볼별 알림 조회 / [호출] NotificationController.getNotificationsBySymbol()
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotificationsBySymbol(Long userId,
                                                             String symbol,
                                                             Pageable pageable) {
        return notificationRepository.findByUserIdAndSymbol(userId, symbol, pageable)
                .map(this::convertToResponse);
    }

    // [용도] 무한 스크롤용 알림 조회 / [호출] NotificationController.getOlderNotifications()
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getOlderNotifications(Long userId,
                                                         Long lastId,
                                                         Pageable pageable) {
        return notificationRepository.findByUserIdAndIdLessThanOrderByIdDesc(userId, lastId, pageable)
                .map(this::convertToResponse);
    }

    // [용도] 특정 기간의 사용자 알림 조회 / [호출] NotificationController.getNotificationsByPeriod()
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotificationsByPeriod(
            Long userId, LocalDateTime start, LocalDateTime end, Pageable pageable) {
        if (start.isAfter(end)) {
            throw new IllegalArgumentException("조회 시작일은 종료일보다 늦을 수 없습니다.");
        }
        return notificationRepository
                .findByUserIdAndCreatedAtBetweenOrderByCreatedAtDescIdDesc(userId, start, end, pageable)
                .map(this::convertToResponse);
    }

    @Transactional
    public void deleteNotification(Long userId, Long notificationId) {
        notificationRepository.deleteByIdAndUserId(notificationId, userId);
    }

    @Transactional
    public void deleteAllNotifications(Long userId) {
        notificationRepository.deleteAllByUserId(userId);
    }

    // [용도] Notification -> Response DTO 변환 / [호출] getNotifications() 등 내부 호출
    private NotificationType normalizeTypeForPersistence(NotificationType type) {
        return type;
    }

    private NotificationResponse convertToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .symbol(notification.getSymbol())
                .createdAt(notification.getCreatedAt())
                .isRead(notification.getIsRead())
                .readAt(notification.getReadAt())
                .build();
    }
}
