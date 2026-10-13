// [파일 용도] 알림 API 컨트롤러

package com.tradediary.notification;

import com.tradediary.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

// [클래스] 테스트 알림 생성 요청 DTO
// [클래스] 알림 관련 API Endpoints
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // [용도] 사용자 알림 목록 조회 / [호출] 프론트엔드 알림 목록 화면
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getNotifications(
            @AuthenticationPrincipal Long userId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.success(notificationService.getNotifications(userId, pageable))
        );
    }

    // [용도] 미읽은 알림 수 조회 / [호출] 프론트엔드 알림 아이콨 표시
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(
                ApiResponse.success(notificationService.getUnreadCount(userId))
        );
    }

    // [용도] 미읽은 알림 목록 조회 / [호출] 프론트엔드 알림 팝업
    @GetMapping("/unread")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getUnreadNotifications(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(
                ApiResponse.success(notificationService.getUnreadNotifications(userId))
        );
    }

    // [용도] 모든 알림 읽음 처리 / [호출] 프론트엔드 전체 읽기 버튼
    @PostMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(@AuthenticationPrincipal Long userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // [용도] 특정 알림 읽음 처리 / [호출] 프론트엔드 개별 알림 클릭
    @PostMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<Void>> markNotificationAsRead(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long notificationId) {
        notificationService.markNotificationAsRead(userId, notificationId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // [용도] 알림 타입별 조회 / [호출] 프론트엔드 필터링
    @GetMapping("/type/{type}")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getNotificationsByType(
            @AuthenticationPrincipal Long userId,
            @PathVariable NotificationType type,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.success(notificationService.getNotificationsByType(userId, type, pageable))
        );
    }

    // [용도] 심볼별 알림 조회 / [호출] 프론트엔드 필터링
    @GetMapping("/symbol/{symbol}")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getNotificationsBySymbol(
            @AuthenticationPrincipal Long userId,
            @PathVariable String symbol,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.success(notificationService.getNotificationsBySymbol(userId, symbol, pageable))
        );
    }

    // [용도] 특정 시간 이후 알림 조회 / [호출] 프론트엔드 무한 스크롤
    @GetMapping("/older")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getOlderNotifications(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) Long lastId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.success(notificationService.getOlderNotifications(
                        userId,
                        lastId == null ? Long.MAX_VALUE : lastId,
                        pageable
                ))
        );
    }

    // [용도] 특정 기간 내 알림 조회 / [호출] 프론트엔드 필터링
    @GetMapping("/period")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getNotificationsByPeriod(
            @AuthenticationPrincipal Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.success(notificationService.getNotificationsByPeriod(userId, start, end, pageable))
        );
    }

    // [용도] 알림 삭제 / [호출] 프론트엔드 삭제 기능
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long notificationId) {
        notificationService.deleteNotification(userId, notificationId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteAllNotifications(
            @AuthenticationPrincipal Long userId) {
        notificationService.deleteAllNotifications(userId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // [용도] 테스트용 알림 생성 / [호출] 개발자 테스트용
}
