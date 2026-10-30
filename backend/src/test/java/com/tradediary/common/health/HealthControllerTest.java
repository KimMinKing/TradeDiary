// [파일 용도] 헬스 API의 DB 준비 상태 응답 단위 테스트

package com.tradediary.common.health;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

// [클래스] DB 연결 정상 시 UP 응답 검증
class HealthControllerTest {

    // [용도] SELECT 1 성공 시 앱과 DB가 UP으로 표시되는지 확인 / [호출] Gradle test
    @Test
    void reportsUpWhenDatabaseIsReachable() {
        JdbcTemplate jdbcTemplate = new JdbcTemplate() {
            @Override
            public <T> T queryForObject(String sql, Class<T> requiredType) {
                return requiredType.cast(1);
            }
        };

        ResponseEntity<Map<String, Object>> response = new HealthController(jdbcTemplate).health();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsEntry("status", "UP").containsEntry("database", "UP");
    }
}
