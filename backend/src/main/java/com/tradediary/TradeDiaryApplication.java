// [파일 용도] Spring Boot 애플리케이션 진입점

package com.tradediary;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// [클래스] Spring Boot 메인 애플리케이션 클래스
@SpringBootApplication
@EnableScheduling
public class TradeDiaryApplication {

    public static void main(String[] args) {

        SpringApplication.run(TradeDiaryApplication.class, args);
    }
}
