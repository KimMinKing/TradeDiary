// [파일 용도] 사용자 프로필 조회 및 변경 API 엔드포인트

package com.tradediary.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// [클래스] 사용자 프로필 관련 REST API 컨트롤러
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // [용도] 현재 사용자 정보 조회 / [호출] GET /api/user/me
    @GetMapping("/me")
    public ResponseEntity<UserService.UserInfo> getMe(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(userService.getMe(userId));
    }

    // [용도] 닉네임 변경 / [호출] PATCH /api/user/nickname
    @PatchMapping("/nickname")
    public ResponseEntity<Void> updateNickname(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody NicknameRequest request
    ) {
        userService.updateNickname(userId, request.nickname());
        return ResponseEntity.ok().build();
    }

    // [용도] 비밀번호 변경 / [호출] PATCH /api/user/password
    @PatchMapping("/password")
    public ResponseEntity<Void> updatePassword(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody PasswordRequest request
    ) {
        userService.updatePassword(userId, request.currentPassword(), request.newPassword());
        return ResponseEntity.ok().build();
    }

    // [용도] 프로필 아바타 변경 / [호출] PATCH /api/user/avatar
    @PatchMapping("/avatar")
    public ResponseEntity<Void> updateAvatar(
            @AuthenticationPrincipal Long userId,
            @RequestBody AvatarRequest request
    ) {
        userService.updateAvatar(userId, request.avatar());
        return ResponseEntity.ok().build();
    }

    // 요청 DTO
    public record NicknameRequest(
            @NotBlank @Size(min = 2, max = 20) String nickname
    ) {}

    public record PasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8) String newPassword
    ) {}

    public record AvatarRequest(String avatar) {}
}
