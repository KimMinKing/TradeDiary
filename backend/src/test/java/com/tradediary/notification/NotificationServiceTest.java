// [파일 용도] 알림 기간 조회 검증 및 Repository 위임 단위 테스트

package com.tradediary.notification;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// [클래스] 알림 기간 조건의 경계 검증
class NotificationServiceTest {

    // [용도] 역전된 기간이 DB 조회 전에 거부되는지 확인 / [호출] Gradle test
    @Test
    void rejectsReversedPeriodBeforeRepositoryQuery() {
        NotificationRepository repository = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repository, null, null);
        LocalDateTime start = LocalDateTime.of(2026, 8, 3, 12, 0);
        LocalDateTime end = start.minusMinutes(1);

        assertThrows(IllegalArgumentException.class,
                () -> service.getNotificationsByPeriod(7L, start, end, PageRequest.of(0, 20)));
        verifyNoInteractions(repository);
    }

    // [용도] 정상 기간이 사용자 범위 Repository 조회로 위임되는지 확인 / [호출] Gradle test
    @Test
    void delegatesValidPeriodWithUserScope() {
        NotificationRepository repository = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repository, null, null);
        LocalDateTime start = LocalDateTime.of(2026, 8, 1, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 8, 3, 23, 59);
        PageRequest pageable = PageRequest.of(0, 20);
        when(repository.findByUserIdAndCreatedAtBetweenOrderByCreatedAtDescIdDesc(7L, start, end, pageable))
                .thenReturn(Page.empty(pageable));

        Page<NotificationResponse> result = service.getNotificationsByPeriod(7L, start, end, pageable);

        assertEquals(0, result.getTotalElements());
        verify(repository).findByUserIdAndCreatedAtBetweenOrderByCreatedAtDescIdDesc(7L, start, end, pageable);
    }
}
