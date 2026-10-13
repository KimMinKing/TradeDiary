// [파일 용도] 사용자 알림 데이터 JPA 엔티티

package com.tradediary.notification;

import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// [클래스] notifications 테이블 매핑 엔티티 (사용자 알림)
@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Column(nullable = false, length = 500)
    private String title;       // 알림 제목

    @Column(nullable = false, length = 1000)
    private String message;    // 알림 내용

    @Column(length = 100)
    private String symbol;     // 관련 코인 심볼 (예: KRW-BTC)

    @Column(nullable = false)
    private LocalDateTime createdAt;  // 알림 생성 시간

    @Column(nullable = true)
    private LocalDateTime readAt;    // 읽은 시간 (null: 미읽음)

    @Column(nullable = false)
    private Boolean isRead = false;  // 읽음 여부

    @Column(nullable = false, length = 255)
    private String relatedId;        // 관련 데이터 ID (거래ID, 포지션ID 등)

    @Builder
    public Notification(User user, NotificationType type, String title, String message,
                        String symbol, String relatedId) {
        this.user = user;
        this.type = type;
        this.title = title;
        this.message = message;
        this.symbol = symbol;
        this.relatedId = relatedId;
        this.createdAt = LocalDateTime.now();
        this.readAt = null;
        this.isRead = false;
    }

    // [용도] 알림 읽음 처리 / [호출] NotificationService.markAsRead()
    public void markAsRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }

    // [용도] 알림 읽지 않음으로 변경 / [호출] NotificationService.markAsUnread()
    public void markAsUnread() {
        this.isRead = false;
        this.readAt = null;
    }
}
