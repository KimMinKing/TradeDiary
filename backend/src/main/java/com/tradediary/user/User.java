// [파일 용도] 사용자 계정 JPA 엔티티

package com.tradediary.user;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// [클래스] users 테이블 매핑 엔티티
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = true)
    private String password;

    @Column(nullable = false, length = 50)
    private String nickname;

    @Column(unique = true, length = 100)
    private String googleId;

    @Column(unique = true, length = 100)
    private String kakaoId;

    @Column(columnDefinition = "TEXT")
    private String avatar;

    @Column(precision = 30, scale = 2)
    private BigDecimal totalAssets;

    @Column(nullable = false)
    private Boolean diaryPublic = false;

    private LocalDateTime assetsUpdatedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public User(String email, String password, String nickname, String googleId, String kakaoId) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.googleId = googleId;
        this.kakaoId = kakaoId;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 카카오 ID 연동 / [호출] GoogleOAuth2UserService.loadUser()
    public void linkKakaoId(String kakaoId) {
        this.kakaoId = kakaoId;
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 기존 이메일 계정에 Google ID 연동 / [호출] GoogleOAuth2UserService.loadUser()
    public void linkGoogleId(String googleId) {
        this.googleId = googleId;
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 닉네임 변경 / [호출] UserService.updateNickname()
    public void updateNickname(String nickname) {
        this.nickname = nickname;
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 비밀번호 변경 (인코딩된 값으로 교체) / [호출] UserService.updatePassword()
    public void updatePassword(String encodedPassword) {
        this.password = encodedPassword;
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 프로필 아바타 이미지 변경 (base64) / [호출] UserService.updateAvatar()
    public void updateAvatar(String avatar) {
        this.avatar = avatar;
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 총 자산 스냅샷 업데이트 / [호출] BalanceController.getBalances()
    public void updateTotalAssets(BigDecimal totalAssets) {
        this.totalAssets = totalAssets;
        this.assetsUpdatedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // [용도] 일기 공개 여부 설정 / [호출] UserController.updateDiaryPublic()
    public void updateDiaryPublic(boolean diaryPublic) {
        this.diaryPublic = diaryPublic;
        this.updatedAt = LocalDateTime.now();
    }
}
