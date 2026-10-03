package com.tradediary.exchange;

import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExchangeSyncFailureTest {

    @Test
    void bitgetHttpFailureDoesNotLookLikeEmptyImport() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.enqueue(new MockResponse().setResponseCode(503).setBody("unavailable"));
            server.start();
            BitgetClient client = new BitgetClient();
            ReflectionTestUtils.setField(client, "baseUrl", baseUrl(server));

            assertThatThrownBy(() -> client.getOrders("key", "secret", "passphrase", startTime()))
                    .isInstanceOf(RuntimeException.class);
            assertThat(server.getRequestCount()).isEqualTo(1);
        }
    }

    @Test
    void okxHttpFailureDoesNotLookLikeEmptyImport() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.enqueue(new MockResponse().setResponseCode(503).setBody("unavailable"));
            server.start();
            OkxClient client = new OkxClient();
            ReflectionTestUtils.setField(client, "baseUrl", baseUrl(server));

            assertThatThrownBy(() -> client.getOrders("key", "secret", "passphrase", startTime()))
                    .isInstanceOf(RuntimeException.class);
            assertThat(server.getRequestCount()).isEqualTo(1);
        }
    }

    @Test
    void binanceTradeFailureAfterSymbolDiscoveryFailsImport() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.setDispatcher(new Dispatcher() {
                @Override
                public MockResponse dispatch(RecordedRequest request) {
                    if (request.getPath().startsWith("/fapi/v1/income")) {
                        return new MockResponse().setResponseCode(200)
                                .setBody("[{\"symbol\":\"BTCUSDT\",\"time\":1}]");
                    }
                    return new MockResponse().setResponseCode(503).setBody("unavailable");
                }
            });
            server.start();
            BinanceClient client = new BinanceClient();
            ReflectionTestUtils.setField(client, "baseUrl", baseUrl(server));

            assertThatThrownBy(() -> client.getTrades("key", "secret", startTime()))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("userTrades HTTP 503");
            assertThat(server.getRequestCount()).isEqualTo(2);
        }
    }

    @Test
    void bingxTradeFailureAfterSymbolDiscoveryFailsImport() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.setDispatcher(new Dispatcher() {
                @Override
                public MockResponse dispatch(RecordedRequest request) {
                    if (request.getPath().startsWith("/openApi/swap/v2/quote/contracts")) {
                        return new MockResponse().setResponseCode(200)
                                .setBody("{\"code\":0,\"data\":[{\"symbol\":\"BTC-USDT\"}]}");
                    }
                    return new MockResponse().setResponseCode(503).setBody("unavailable");
                }
            });
            server.start();
            BingxClient client = new BingxClient();
            ReflectionTestUtils.setField(client, "baseUrl", baseUrl(server));

            assertThatThrownBy(() -> client.getTrades("key", "secret", startTime()))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("allFillOrders HTTP 503");
            assertThat(server.getRequestCount()).isEqualTo(2);
        }
    }

    @Test
    void bingxContractsApiErrorDoesNotLookLikeNoSymbols() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.enqueue(new MockResponse().setResponseCode(200)
                    .setBody("{\"code\":10001,\"msg\":\"invalid key\",\"data\":[]}"));
            server.start();
            BingxClient client = new BingxClient();
            ReflectionTestUtils.setField(client, "baseUrl", baseUrl(server));

            assertThatThrownBy(() -> client.getTrades("key", "secret", startTime()))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("contracts API error");
            assertThat(server.getRequestCount()).isEqualTo(1);
        }
    }

    private LocalDateTime startTime() {
        return LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusHours(1);
    }

    private String baseUrl(MockWebServer server) {
        return server.url("/").toString().replaceAll("/$", "");
    }
}
