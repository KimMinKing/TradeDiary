// [파일 용도] 전략 태그 JPA 엔티티

package com.tradediary.journal;

import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// [클래스] strategy_tags 테이블 매핑 엔티티 (user_id=NULL이면 기본 제공 태그)
@Entity
@Table(name = "strategy_tags")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StrategyTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // user_id가 NULL이면 전체 공용 기본 태그
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 20)
    private String color;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public StrategyTag(User user, String name, String color) {
        this.user = user;
        this.name = name;
        this.color = color != null ? color : "#00d4aa";
        this.createdAt = LocalDateTime.now();
    }
}
