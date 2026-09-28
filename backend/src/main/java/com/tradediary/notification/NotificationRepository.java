// [파일 용도] 알림 데이터 저장 및 조회 Repository

package com.tradediary.notification;

import com.tradediary.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;

// [클래스] notifications 테이블 JPA Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Optional<Notification> findByUserIdAndRelatedId(Long userId, String relatedId);

    // [용도] 특정 사용자의 알림 목록 조회 / [호출] NotificationService.getNotificationsByUser()
    Page<Notification> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);

    // [용도] 특정 사용자의 미읽은 알림 수 조회 / [호출] NotificationService.getUnreadCount()
    long countByUserIdAndIsRead(Long userId, Boolean isRead);

    // [용도] 특정 사용자의 미읽은 알림 목록 조회 / [호출] NotificationService.getUnreadNotifications()
    List<Notification> findByUserIdAndIsReadOrderByCreatedAtDescIdDesc(Long userId, Boolean isRead);

    // [용도] 특정 사용자의 모든 알림 읽음 처리 / [호출] NotificationService.markAllAsRead()
    // bulk UPDATE → 반드시 @Modifying 필요 (@Transactional 은 Service 측에서 보장)
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.user.id = :userId AND n.isRead = false")
    void markAllAsReadByUserId(@Param("userId") Long userId);

    // [용도] 특정 사용자의 특정 알림만 읽음 처리 / [호출] NotificationService.markNotificationAsRead()
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.id = :notificationId AND n.user.id = :userId")
    void markAsReadByIdAndUserId(@Param("notificationId") Long notificationId, @Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.id = :notificationId AND n.user.id = :userId")
    void deleteByIdAndUserId(@Param("notificationId") Long notificationId, @Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);

    // [용도] 특정 타입의 알림만 조회 / [호출] NotificationService.getNotificationsByType()
    Page<Notification> findByUserIdAndType(Long userId, NotificationType type, Pageable pageable);

    // [용도] 특정 심볼과 관련된 알림 조회 / [호출] NotificationService.getNotificationsBySymbol()
    Page<Notification> findByUserIdAndSymbol(Long userId, String symbol, Pageable pageable);

    // [용도] 특정 ID 이전의 알림들 조회 (무한 스크롤) / [호출] NotificationService.getOlderNotifications()
    Page<Notification> findByUserIdAndIdLessThanOrderByIdDesc(Long userId, Long lastId, Pageable pageable);

    // [용도] 특정 기간의 사용자 알림 조회 / [호출] NotificationService.getNotificationsByPeriod()
    Page<Notification> findByUserIdAndCreatedAtBetweenOrderByCreatedAtDescIdDesc(
            Long userId, LocalDateTime start, LocalDateTime end, Pageable pageable);
}
