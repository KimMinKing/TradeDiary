// [파일 용도] 테스트 데이터 생성 실행 스크립트

package com.tradediary.journal.scripts;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;

//@SpringBootApplication
public class RunDataGenerator {

    public static void main(String[] args) {
        // Spring Boot 애플리케이션 시작
        ConfigurableApplicationContext context = SpringApplication.run(RunDataGenerator.class, args);

        // 데이터 생성 서비스 가져오기
        ComprehensiveTestDataGenerator generator = context.getBean(ComprehensiveTestDataGenerator.class);

        // 데이터 생성 실행
        String result = generator.generateComprehensiveTestData();

        // 결과 출력
        System.out.println("============================================================");
        System.out.println("데이터 생성 결과:");
        System.out.println(result);
        System.out.println("============================================================");

        // 애플리케이션 종료
        SpringApplication.exit(context, () -> 0);
    }
}