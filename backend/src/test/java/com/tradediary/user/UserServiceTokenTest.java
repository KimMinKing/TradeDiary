// [파일 용도] Refresh Token 폐기 및 비밀번호 재설정 세션 무효화 단위 테스트

package com.tradediary.user;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.common.security.JwtUtil;
import com.tradediary.common.security.RefreshTokenRepository;
import com.tradediary.position.PositionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// [클래스] 저장되지 않은 Refresh Token 거부와 비밀번호 변경 후 세션 폐기 검증
class UserServiceTokenTest {

    @Test
    void rejectsRefreshTokenThatIsNotStored() {
        RefreshTokenRepository refreshTokens = mock(RefreshTokenRepository.class);
        JwtUtil jwtUtil = jwtUtil();
        when(refreshTokens.findByToken("revoked-token")).thenReturn(Optional.empty());
        UserService service = service(refreshTokens, mock(PasswordResetTokenRepository.class),
                mock(PasswordEncoder.class), jwtUtil);

        BusinessException error = assertThrows(BusinessException.class,
                () -> service.refresh("revoked-token"));

        assertEquals(ErrorCode.REFRESH_TOKEN_NOT_FOUND, error.getErrorCode());
    }

    @Test
    void revokesExistingSessionsAfterPasswordReset() {
        RefreshTokenRepository refreshTokens = mock(RefreshTokenRepository.class);
        PasswordResetTokenRepository resetTokens = mock(PasswordResetTokenRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        User user = User.builder()
                .email("user@example.com")
                .password("old-password")
                .nickname("tester")
                .build();
        ReflectionTestUtils.setField(user, "id", 42L);
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token("reset-token")
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();

        when(resetTokens.findByToken("reset-token")).thenReturn(Optional.of(resetToken));
        when(encoder.encode("new-password")).thenReturn("encoded-password");

        UserService service = service(refreshTokens, resetTokens, encoder, jwtUtil());
        service.resetPassword("reset-token", "new-password");

        assertEquals("encoded-password", user.getPassword());
        assertEquals(true, resetToken.isUsed());
        verify(refreshTokens).deleteByUserId(42L);
    }

    private UserService service(
            RefreshTokenRepository refreshTokens,
            PasswordResetTokenRepository resetTokens,
            PasswordEncoder encoder,
            JwtUtil jwtUtil
    ) {
        return new UserService(
                mock(UserRepository.class),
                refreshTokens,
                resetTokens,
                mock(PositionRepository.class),
                encoder,
                jwtUtil,
                null,
                null,
                null
        );
    }

    private JwtUtil jwtUtil() {
        return new JwtUtil(
                "test-secret-key-that-is-at-least-32-bytes-long",
                1_800_000L,
                604_800_000L
        );
    }
}
