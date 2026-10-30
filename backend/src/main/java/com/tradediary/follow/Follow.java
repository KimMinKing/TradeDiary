// [파일 용도] 팔로우 데이터 JPA 엔티티

package com.tradediary.follow;

import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// [클래스] follows 테이블 매핑 엔티티 (사용자 팔로우)
@Entity
@Table(name = "follows", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"follower_id", "following_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Follow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "follower_id", nullable = false)
    private User follower;      // 팔로우를 하는 사람 (나)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "following_id", nullable = false)
    private User following;     // 팔로우를 당하는 사람 (트레이더)

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime lastFollowerTradeNotifiedAt;

    @Column(nullable = false)
    private boolean tradeAlertsEnabled = false;

    @Builder
    public Follow(User follower, User following, LocalDateTime lastFollowerTradeNotifiedAt) {
        this.follower = follower;
        this.following = following;
        this.createdAt = LocalDateTime.now();
        this.lastFollowerTradeNotifiedAt = lastFollowerTradeNotifiedAt;
    }

    public void updateLastFollowerTradeNotifiedAt(LocalDateTime lastFollowerTradeNotifiedAt) {
        this.lastFollowerTradeNotifiedAt = lastFollowerTradeNotifiedAt;
    }

    public void updateTradeAlerts(boolean enabled, LocalDateTime cursor) {
        this.tradeAlertsEnabled = enabled;
        if (enabled) this.lastFollowerTradeNotifiedAt = cursor;
    }
}
