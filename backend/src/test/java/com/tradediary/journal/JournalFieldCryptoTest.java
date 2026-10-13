package com.tradediary.journal;

import jakarta.persistence.PersistenceException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JournalFieldCryptoTest {
    private final JournalFieldCrypto crypto = new JournalFieldCrypto("test-journal-secret-key-at-least-32-bytes");

    @Test
    void encryptsWithUniqueNonceAndDecrypts() {
        String first = crypto.encrypt("private journal memo");
        String second = crypto.encrypt("private journal memo");

        assertThat(first).startsWith("enc:v1:").isNotEqualTo(second);
        assertThat(crypto.decrypt(first)).isEqualTo("private journal memo");
        assertThat(crypto.decrypt(second)).isEqualTo("private journal memo");
    }

    @Test
    void rejectsTamperedCiphertext() {
        String encrypted = crypto.encrypt("private journal memo");
        String tampered = encrypted.substring(0, encrypted.length() - 2) + "AA";

        assertThatThrownBy(() -> crypto.decrypt(tampered)).isInstanceOf(PersistenceException.class);
    }

    @Test
    void readsLegacyPlaintextForOnlineMigration() {
        assertThat(crypto.decrypt("legacy memo")).isEqualTo("legacy memo");
    }
}
