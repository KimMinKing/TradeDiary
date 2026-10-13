package com.tradediary.journal;

import jakarta.persistence.PersistenceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class JournalFieldCrypto {
    static final String PREFIX = "enc:v1:";
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public JournalFieldCrypto(@Value("${aes.secret}") String secret) {
        if (secret == null || secret.length() < 24) {
            throw new IllegalStateException("AES_SECRET must contain at least 24 characters");
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8));
            this.key = new SecretKeySpec(digest, "AES");
        } catch (Exception error) {
            throw new IllegalStateException("Unable to initialize journal encryption", error);
        }
    }

    public String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty() || isEncrypted(plainText)) return plainText;
        try {
            byte[] nonce = new byte[NONCE_BYTES];
            random.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
            byte[] ciphertext = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            byte[] payload = ByteBuffer.allocate(nonce.length + ciphertext.length)
                    .put(nonce).put(ciphertext).array();
            return PREFIX + Base64.getEncoder().encodeToString(payload);
        } catch (Exception error) {
            throw new PersistenceException("Unable to encrypt journal content", error);
        }
    }

    public String decrypt(String storedValue) {
        if (storedValue == null || storedValue.isEmpty() || !isEncrypted(storedValue)) return storedValue;
        try {
            byte[] payload = Base64.getDecoder().decode(storedValue.substring(PREFIX.length()));
            if (payload.length <= NONCE_BYTES) throw new IllegalArgumentException("Invalid payload");
            byte[] nonce = new byte[NONCE_BYTES];
            byte[] ciphertext = new byte[payload.length - NONCE_BYTES];
            System.arraycopy(payload, 0, nonce, 0, nonce.length);
            System.arraycopy(payload, nonce.length, ciphertext, 0, ciphertext.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception error) {
            throw new PersistenceException("Journal content failed integrity verification", error);
        }
    }

    public boolean isEncrypted(String value) {
        return value != null && value.startsWith(PREFIX);
    }
}
