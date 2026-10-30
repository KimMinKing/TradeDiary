// [파일 용도] 배포 및 컨테이너 상태 확인용 경량 헬스 API

package com.tradediary.common.health;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

// [클래스] 애플리케이션과 DB 연결 준비 상태를 외부 헬스체크에 제공
@RestController
@RequiredArgsConstructor
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    // [용도] 앱·DB 준비 상태 확인 / [호출] Docker 및 배포 스크립트
    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        Integer databaseCheck = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        return ResponseEntity.ok(Map.of(
                "status", databaseCheck != null && databaseCheck == 1 ? "UP" : "DOWN",
                "database", "UP",
                "timestamp", Instant.now().toString()
        ));
    }
}
