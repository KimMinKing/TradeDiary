package com.tradediary.exchange;

import com.tradediary.common.util.AesUtil;
import com.tradediary.journal.TradeJournalService;
import com.tradediary.position.PositionService;
import com.tradediary.trade.TradeRepository;
import com.tradediary.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;

class ExchangeKeyServiceTest {
    @Test
    void corruptedCredentialRemainsVisibleForReconnection() {
        AesUtil crypto = new AesUtil("0123456789abcdef0123456789abcdef");
        ExchangeKeyRepository repository = mock(ExchangeKeyRepository.class);
        ExchangeKey key = ExchangeKey.builder()
                .exchange(ExchangeKey.Exchange.UPBIT)
                .apiKey(crypto.encrypt("api-key-value"))
                .secretKey("invalid-ciphertext")
                .build();
        when(repository.findAllByUserId(7L)).thenReturn(List.of(key));
        ExchangeKeyService service = new ExchangeKeyService(repository, mock(UserRepository.class),
                crypto, mock(PositionService.class), mock(TradeRepository.class),
                mock(TradeJournalService.class), mock(JdbcTemplate.class));

        var connections = service.getMyKeys(7L);

        assertThat(connections).hasSize(1);
        assertThat(connections.get(0).exchange()).isEqualTo("UPBIT");
        assertThat(connections.get(0).reconnectRequired()).isTrue();
        assertThat(connections.get(0).maskedApiKey()).isNull();
    }

    @Test
    void reconnectUpdatesExistingKeyAndQueuesFreshImport() {
        AesUtil crypto = new AesUtil("0123456789abcdef0123456789abcdef");
        ExchangeKeyRepository repository = mock(ExchangeKeyRepository.class);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ExchangeKey key = ExchangeKey.builder()
                .exchange(ExchangeKey.Exchange.UPBIT)
                .apiKey("broken-old-key")
                .secretKey("broken-old-secret")
                .build();
        ReflectionTestUtils.setField(key, "id", 9L);
        key.deactivate();
        when(repository.findByUserIdAndExchange(7L, ExchangeKey.Exchange.UPBIT))
                .thenReturn(Optional.of(key));
        ExchangeKeyService service = new ExchangeKeyService(repository, mock(UserRepository.class),
                crypto, mock(PositionService.class), mock(TradeRepository.class),
                mock(TradeJournalService.class), jdbc);

        service.saveKey(7L, "UPBIT", "new-api-key", "new-secret-key", null);

        assertThat(key.isActive()).isTrue();
        assertThat(crypto.decrypt(key.getApiKey())).isEqualTo("new-api-key");
        assertThat(crypto.decrypt(key.getSecretKey())).isEqualTo("new-secret-key");
        verify(repository, never()).delete(any());
        verify(jdbc).update(anyString(), eq(9L));
    }
}
