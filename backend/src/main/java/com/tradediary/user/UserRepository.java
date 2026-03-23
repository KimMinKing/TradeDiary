// [파일 용도] 사용자 데이터 저장 및 조회 Repository

package com.tradediary.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// [클래스] users 테이블 JPA Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // [용도] 이메일로 사용자 조회 / [호출] UserService.login(), UserService.signup()
    Optional<User> findByEmail(String email);

    // [용도] 이메일 중복 확인 / [호출] UserService.signup()
    boolean existsByEmail(String email);

    // [용도] Google ID로 사용자 조회 / [호출] GoogleOAuth2UserService.loadUser()
    Optional<User> findByGoogleId(String googleId);

    // [용도] Kakao ID로 사용자 조회 / [호출] GoogleOAuth2UserService.loadUser()
    Optional<User> findByKakaoId(String kakaoId);
}
