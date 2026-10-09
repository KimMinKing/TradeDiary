package com.tradediary.common.util;

import org.junit.jupiter.api.Test;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AesUtilTest {
    private static final String SECRET = "0123456789abcdef0123456789abcdef";
    private final AesUtil crypto = new AesUtil(SECRET);

    @Test
    void newCiphertextUsesFreshNonceAndRoundTrips() {
        String first = crypto.encrypt("거래소-secret");
        String second = crypto.encrypt("거래소-secret");

        assertThat(first).startsWith("v2:");
        assertThat(second).isNotEqualTo(first);
        assertThat(crypto.decrypt(first)).isEqualTo("거래소-secret");
        assertThat(crypto.decrypt(second)).isEqualTo("거래소-secret");
    }

    @Test
    void readsExistingFixedIvCbcCiphertext() throws Exception {
        byte[] key = SECRET.getBytes(StandardCharsets.UTF_8);
        Cipher legacy = Cipher.getInstance("AES/CBC/PKCS5Padding");
        legacy.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"),
                new IvParameterSpec(Arrays.copyOf(key, 16)));
        String oldValue = Base64.getEncoder().encodeToString(
                legacy.doFinal("old-api-key".getBytes(StandardCharsets.UTF_8)));

        assertThat(crypto.decrypt(oldValue)).isEqualTo("old-api-key");
        assertThat(crypto.isLegacy(oldValue)).isTrue();
    }

    @Test
    void modifiedGcmCiphertextFailsAuthentication() {
        String value = crypto.encrypt("sensitive-value");
        byte[] payload = Base64.getDecoder().decode(value.substring(3));
        payload[payload.length - 1] ^= 1;
        String modified = "v2:" + Base64.getEncoder().encodeToString(payload);

        assertThatThrownBy(() -> crypto.decrypt(modified))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("복호화 실패");
    }
}
