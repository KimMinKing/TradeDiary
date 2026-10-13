// [파일 용도] AES-256 암호화/복호화 유틸 (거래소 API Key 보호용)

package com.tradediary.common.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

// New exchange credentials use authenticated encryption; legacy CBC is read only for migration.
@Component
public class AesUtil {

    private static final String PREFIX = "v2:";
    private static final String GCM_ALGORITHM = "AES/GCM/NoPadding";
    private static final String LEGACY_ALGORITHM = "AES/CBC/PKCS5Padding";
    private static final int NONCE_LENGTH = 12;
    private static final int TAG_BITS = 128;
    private final SecureRandom random = new SecureRandom();
    private final SecretKeySpec secretKeySpec;
    private final IvParameterSpec legacyIv;

    public AesUtil(@Value("${aes.secret}") String secret) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        // AES-256: 32바이트 필요
        byte[] key = new byte[32];
        System.arraycopy(keyBytes, 0, key, 0, Math.min(keyBytes.length, 32));
        this.secretKeySpec = new SecretKeySpec(key, "AES");
        this.legacyIv = new IvParameterSpec(Arrays.copyOf(key, 16));
    }

    // [용도] 문자열 암호화 → Base64 반환 / [호출] ExchangeKeyService.saveKey()
    public String encrypt(String plainText) {
        try {
            byte[] nonce = new byte[NONCE_LENGTH];
            random.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance(GCM_ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, new GCMParameterSpec(TAG_BITS, nonce));
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            byte[] payload = new byte[nonce.length + encrypted.length];
            System.arraycopy(nonce, 0, payload, 0, nonce.length);
            System.arraycopy(encrypted, 0, payload, nonce.length, encrypted.length);
            return PREFIX + Base64.getEncoder().encodeToString(payload);
        } catch (Exception e) {
            throw new RuntimeException("암호화 실패", e);
        }
    }

    // [용도] Base64 문자열 복호화 → 원문 반환 / [호출] UpbitClient (API 호출 전)
    public String decrypt(String encryptedText) {
        try {
            byte[] decrypted;
            if (encryptedText.startsWith(PREFIX)) {
                byte[] payload = Base64.getDecoder().decode(encryptedText.substring(PREFIX.length()));
                if (payload.length < NONCE_LENGTH + TAG_BITS / 8) {
                    throw new IllegalArgumentException("Invalid encrypted payload");
                }
                byte[] nonce = Arrays.copyOfRange(payload, 0, NONCE_LENGTH);
                Cipher cipher = Cipher.getInstance(GCM_ALGORITHM);
                cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, new GCMParameterSpec(TAG_BITS, nonce));
                decrypted = cipher.doFinal(payload, NONCE_LENGTH, payload.length - NONCE_LENGTH);
            } else {
                Cipher cipher = Cipher.getInstance(LEGACY_ALGORITHM);
                cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, legacyIv);
                decrypted = cipher.doFinal(Base64.getDecoder().decode(encryptedText));
            }
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("복호화 실패", e);
        }
    }

    public boolean isLegacy(String encryptedText) {
        return encryptedText != null && !encryptedText.startsWith(PREFIX);
    }
}
