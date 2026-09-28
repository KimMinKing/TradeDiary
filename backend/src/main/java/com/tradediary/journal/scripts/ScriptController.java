// [파일 용도] 관리자용 스크립트 실행 컨트롤러

package com.tradediary.journal.scripts;

import org.springframework.web.bind.annotation.*;
import org.springframework.context.annotation.Profile;

@RestController
@RequestMapping("/admin/scripts")
@Profile({"local", "dev"})
public class ScriptController {

    private final TestDataGenerator testDataGenerator;
    private final ComprehensiveTestDataGenerator comprehensiveTestDataGenerator;

    public ScriptController(TestDataGenerator testDataGenerator,
                          ComprehensiveTestDataGenerator comprehensiveTestDataGenerator) {
        this.testDataGenerator = testDataGenerator;
        this.comprehensiveTestDataGenerator = comprehensiveTestDataGenerator;
    }

    // [용도] 기본 테스트 데이터 생성
    @PostMapping("/generate-test-data")
    public String generateTestData() {
        return testDataGenerator.generateTestData();
    }

    // [용도] 종합 테스트 데이터 생성 (10명, 다중 거래소, 2개월치)
    @PostMapping("/generate-comprehensive-test-data")
    public String generateComprehensiveTestData() {
        return comprehensiveTestDataGenerator.generateComprehensiveTestData();
    }
}
