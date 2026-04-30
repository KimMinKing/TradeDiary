// [파일 용도] 회원가입, 로그인, 토큰 재발급, 로그아웃 비즈니스 로직

package com.tradediary.user;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.common.security.JwtUtil;
import com.tradediary.common.security.RefreshToken;
import com.tradediary.common.security.RefreshTokenRepository;
import com.tradediary.position.Position;
import com.tradediary.position.PositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

// [클래스] 인증 관련 핵심 비즈니스 로직 처리
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PositionRepository positionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    // [용도] 회원가입 / [호출] AuthController.signup()
    @Transactional
    public void signup(String email, String password, String nickname) {
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .nickname(nickname)
                .build();

        userRepository.save(user);
    }

    // [용도] 로그인 → AccessToken + RefreshToken 반환 / [호출] AuthController.login()
    @Transactional
    public TokenResponse login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }

        String accessToken = jwtUtil.generateAccessToken(user.getId());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());

        // 기존 RefreshToken 삭제 후 새로 저장
        refreshTokenRepository.deleteByUserId(user.getId());
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(refreshToken)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
                .build());

        return new TokenResponse(accessToken, refreshToken);
    }

    // [용도] RefreshToken으로 AccessToken 재발급 / [호출] AuthController.refresh()
    @Transactional
    public TokenResponse refresh(String refreshToken) {
        RefreshToken stored = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new BusinessException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(stored);
            throw new BusinessException(ErrorCode.EXPIRED_TOKEN);
        }

        Long userId = stored.getUser().getId();
        String newAccessToken = jwtUtil.generateAccessToken(userId);
        String newRefreshToken = jwtUtil.generateRefreshToken(userId);

        // RefreshToken 교체
        refreshTokenRepository.delete(stored);
        refreshTokenRepository.save(RefreshToken.builder()
                .user(stored.getUser())
                .token(newRefreshToken)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
                .build());

        return new TokenResponse(newAccessToken, newRefreshToken);
    }

    // [용도] 로그아웃 (RefreshToken 삭제) / [호출] AuthController.logout()
    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository.deleteByUserId(userId);
    }

    // [용도] 현재 사용자 정보 조회 / [호출] UserController.getMe()
    @Transactional(readOnly = true)
    public UserInfo getMe(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return new UserInfo(user.getEmail(), user.getNickname(), user.getAvatar(),
                user.getDiaryPublic(), user.getTotalAssets());
    }

    // [용도] 닉네임 변경 / [호출] UserController.updateNickname()
    @Transactional
    public void updateNickname(Long userId, String nickname) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        user.updateNickname(nickname);
    }

    // [용도] 비밀번호 변경 (현재 비밀번호 확인 후 변경) / [호출] UserController.updatePassword()
    @Transactional
    public void updatePassword(Long userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }
        user.updatePassword(passwordEncoder.encode(newPassword));
    }

    // [용도] 비밀번호 재설정 이메일 발송 / [호출] AuthController.requestPasswordReset()
    // 해당 이메일이 없어도 성공 응답 (이메일 존재 여부 노출 방지)
    @Transactional
    public void requestPasswordReset(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            // 기존 미사용 토큰 삭제 (1인 1토큰)
            passwordResetTokenRepository.deleteUnusedByUserId(user.getId());

            String token = UUID.randomUUID().toString().replace("-", "");
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .token(token)
                    .expiresAt(LocalDateTime.now().plusMinutes(30))
                    .build();
            passwordResetTokenRepository.save(resetToken);

            emailService.sendPasswordResetEmail(email, token);
        });
    }

    // [용도] 토큰 검증 후 비밀번호 변경 / [호출] AuthController.resetPassword()
    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESET_TOKEN_NOT_FOUND));

        if (resetToken.isUsed()) {
            throw new BusinessException(ErrorCode.RESET_TOKEN_USED);
        }
        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.RESET_TOKEN_EXPIRED);
        }

        resetToken.getUser().updatePassword(passwordEncoder.encode(newPassword));
        resetToken.markUsed();
    }

    // [용도] 토큰 응답 DTO (내부 클래스)
    public record TokenResponse(String accessToken, String refreshToken) {}

    // [용도] 프로필 아바타 변경 (base64 이미지) / [호출] UserController.updateAvatar()
    @Transactional
    public void updateAvatar(Long userId, String avatar) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        user.updateAvatar(avatar);
    }

    // [용도] 사용자 정보 응답 DTO
    public record UserInfo(String email, String nickname, String avatar,
                           Boolean diaryPublic, BigDecimal totalAssets) {}

    // [용도] 총 자산 스냅샷 저장 / [호출] BalanceController.getBalances()
    @Transactional
    public void updateTotalAssets(Long userId, BigDecimal totalAssets) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        user.updateTotalAssets(totalAssets);
    }

    // [용도] 일기 공개 여부 토글 / [호출] UserController.updateDiaryPublic()
    @Transactional
    public void updateDiaryPublic(Long userId, boolean diaryPublic) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        user.updateDiaryPublic(diaryPublic);
    }

    // [용도] 공개 프로필 조회 시 diaryPublic 검증 / [호출] UserController.getPublicStats()
    @Transactional(readOnly = true)
    public void validatePublicProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!Boolean.TRUE.equals(user.getDiaryPublic())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    // [용도] 다른 사용자의 공개 프로필 조회 / [호출] UserController.getPublicProfile()
    @Transactional(readOnly = true)
    public PublicProfileResponse getPublicProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!Boolean.TRUE.equals(user.getDiaryPublic())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        List<Position> positions = positionRepository.findByUserIdOrderByClosedAtDesc(userId);

        int totalTrades = positions.size();
        int winCount = (int) positions.stream()
                .filter(p -> p.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
        int lossCount = totalTrades - winCount;
        double winRate = totalTrades > 0 ? Math.round((double) winCount / totalTrades * 10000.0) / 100.0 : 0;

        BigDecimal totalPnl = positions.stream()
                .map(Position::getPnl)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 최대 연승/연패 계산
        List<Position> sorted = positions.stream()
                .sorted(Comparator.comparing(Position::getClosedAt))
                .toList();
        int maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
        for (Position p : sorted) {
            if (p.getPnl().compareTo(BigDecimal.ZERO) > 0) {
                curWin++; curLoss = 0;
                maxWinStreak = Math.max(maxWinStreak, curWin);
            } else {
                curLoss++; curWin = 0;
                maxLossStreak = Math.max(maxLossStreak, curLoss);
            }
        }

        String assets = user.getTotalAssets() != null
                ? user.getTotalAssets().setScale(2, RoundingMode.HALF_UP).toPlainString()
                : null;

        return new PublicProfileResponse(
                user.getNickname(), user.getAvatar(), assets, true,
                winRate, totalTrades,
                totalPnl.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                winCount, lossCount, maxWinStreak, maxLossStreak
        );
    }

    // 공개 프로필 응답 DTO
    public record PublicProfileResponse(
            String nickname, String avatar, String totalAssets, boolean diaryPublic,
            double winRate, int totalTrades, String totalPnl,
            int winCount, int lossCount, int maxWinStreak, int maxLossStreak
    ) {}
}
