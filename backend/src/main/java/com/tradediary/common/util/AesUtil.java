// [파일 용도] AES-256 암호화/복호화 유틸 (거래소 API Key 보호용)

package com.tradediary.common.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

// [클래스] AES-256-CBC 방식으로 문자열 암호화/복호화
@Component
public class AesUtil {

    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";
    // IV는 키의 앞 16바이트를 재사용 (단순화, 운영 환경에서는 랜덤 IV 권장)
    private final SecretKeySpec secretKeySpec;
    private final IvParameterSpec ivParameterSpec;

    public AesUtil(@Value("${aes.secret}") String secret) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        // AES-256: 32바이트 필요
        byte[] key = new byte[32];
        System.arraycopy(keyBytes, 0, key, 0, Math.min(keyBytes.length, 32));
        this.secretKeySpec = new SecretKeySpec(key, "AES");
        // IV: 키 앞 16바이트 사용
        byte[] iv = new byte[16];
        System.arraycopy(key, 0, iv, 0, 16);
        this.ivParameterSpec = new IvParameterSpec(iv);
    }

    // [용도] 문자열 암호화 → Base64 반환 / [호출] ExchangeKeyService.saveKey()
    public String encrypt(String plainText) {
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, ivParameterSpec);
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("암호화 실패", e);
        }
    }

    // [용도] Base64 문자열 복호화 → 원문 반환 / [호출] UpbitClient (API 호출 전)
    public String decrypt(String encryptedText) {
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, ivParameterSpec);
            byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(encryptedText));
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("복호화 실패", e);
        }
    }
}
