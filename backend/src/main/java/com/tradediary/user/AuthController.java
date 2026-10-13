// [파일 용도] 회원가입, 로그인, 토큰 재발급, 로그아웃 API 엔드포인트

package com.tradediary.user;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// [클래스] 인증 관련 REST API 컨트롤러
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final AuthRateLimiter authRateLimiter;

    // [용도] 회원가입 / [호출] POST /api/auth/signup
    @PostMapping("/signup")
    public ResponseEntity<Void> signup(@Valid @RequestBody SignupRequest request) {
        userService.signup(request.email(), request.password(), request.nickname());
        return ResponseEntity.ok().build();
    }

    // [용도] 로그인 → 토큰 발급 / [호출] POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<UserService.TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        authRateLimiter.assertLoginAllowed(request.email());
        try {
            UserService.TokenResponse response = userService.login(request.email(), request.password());
            authRateLimiter.clearLoginFailures(request.email());
            return ResponseEntity.ok(response);
        } catch (BusinessException e) {
            if (e.getErrorCode() == ErrorCode.USER_NOT_FOUND
                    || e.getErrorCode() == ErrorCode.INVALID_PASSWORD) {
                authRateLimiter.recordLoginFailure(request.email());
            }
            throw e;
        }
    }

    // [용도] AccessToken 재발급 / [호출] POST /api/auth/refresh
    @PostMapping("/refresh")
    public ResponseEntity<UserService.TokenResponse> refresh(@RequestParam("refreshToken") String refreshToken) {
        return ResponseEntity.ok(userService.refresh(refreshToken));
    }

    // [용도] 로그아웃 / [호출] POST /api/auth/logout
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal Long userId) {
        userService.logout(userId);
        return ResponseEntity.ok().build();
    }

    // [용도] 비밀번호 재설정 이메일 발송 / [호출] POST /api/auth/password-reset/request
    // 이메일 존재 여부와 관계없이 200 응답 (보안상 이유)
    @PostMapping("/password-reset/request")
    public ResponseEntity<Void> requestPasswordReset(
            @Valid @RequestBody PasswordResetRequestDto request) {
        authRateLimiter.acquirePasswordReset(request.email());
        userService.requestPasswordReset(request.email());
        return ResponseEntity.ok().build();
    }

    // [용도] 토큰 검증 후 비밀번호 변경 / [호출] POST /api/auth/password-reset/confirm
    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Void> resetPassword(
            @Valid @RequestBody PasswordResetConfirmDto request) {
        userService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok().build();
    }

    // 요청 DTO
    public record SignupRequest(
            @Email @NotBlank String email,
            @NotBlank @Size(min = 8) String password,
            @NotBlank @Size(min = 2, max = 20) String nickname
    ) {}

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record PasswordResetRequestDto(
            @Email @NotBlank String email
    ) {}

    public record PasswordResetConfirmDto(
            @NotBlank String token,
            @NotBlank @Size(min = 8) String newPassword
    ) {}
}
