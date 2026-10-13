// [파일 용도] 알림 응답 DTO

package com.tradediary.notification;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

// [클래스] 알림 정보 응답 DTO
@Getter
@Builder
public class NotificationResponse {

    private Long id;
    private NotificationType type;
    private String title;
    private String message;
    private String symbol;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    private Boolean isRead;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime readAt;
}