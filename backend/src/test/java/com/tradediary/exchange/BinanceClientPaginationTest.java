package com.tradediary.exchange;

import okhttp3.HttpUrl;
import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class BinanceClientPaginationTest {

    @Test
    void tradeIdsAreScopedToSymbol() {
        BinanceClient.BinanceTrade btc = new BinanceClient.BinanceTrade();
        btc.symbol = "BTCUSDT";
        btc.id = 42;
        BinanceClient.BinanceTrade eth = new BinanceClient.BinanceTrade();
        eth.symbol = "ETHUSDT";
        eth.id = 42;

        assertThat(BinanceClient.NormalizedTrade.from(btc).exchangeTradeId()).isEqualTo("BTCUSDT:42");
        assertThat(BinanceClient.NormalizedTrade.from(eth).exchangeTradeId()).isEqualTo("ETHUSDT:42");
    }

    @Test
    void requestedHistoryIsClampedToBinanceRetention() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.enqueue(json("[]"));
            server.start();

            client(server).getTrades("key", "secret", LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusYears(1));

            HttpUrl url = server.takeRequest().getRequestUrl();
            long requestedStart = Long.parseLong(url.queryParameter("startTime"));
            long oldestExpected = LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusMonths(3)
                    .atZone(ZoneId.of("Asia/Seoul")).toInstant().toEpochMilli();
            assertThat(requestedStart).isBetween(oldestExpected - TimeUnit.MINUTES.toMillis(1), oldestExpected);
            assertThat(server.getRequestCount()).isEqualTo(1);
        }
    }

    @Test
    void incomePagesPreserveSymbolsWithIdenticalTimestamps() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            List<String> requestedPages = new ArrayList<>();
            server.setDispatcher(new Dispatcher() {
                @Override
                public MockResponse dispatch(RecordedRequest request) {
                    HttpUrl url = request.getRequestUrl();
                    if (url.encodedPath().equals("/fapi/v1/income")) {
                        String page = url.queryParameter("page");
                        requestedPages.add(page);
                        assertThat(url.queryParameter("endTime")).isNotNull();
                        if (page.equals("1")) {
                            return json("[" + ("{\"symbol\":\"BTCUSDT\",\"time\":1},").repeat(999)
                                    + "{\"symbol\":\"BTCUSDT\",\"time\":1}]");
                        }
                        return json("[{\"symbol\":\"ETHUSDT\",\"time\":1}]");
                    }
                    return json("[]");
                }
            });
            server.start();

            BinanceClient client = client(server);
            assertThat(client.getTrades("key", "secret", LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusMinutes(1)))
                    .isEmpty();
            assertThat(requestedPages).containsExactly("1", "2");
            assertThat(server.getRequestCount()).isEqualTo(4);
        }
    }

    @Test
    void fullTradePageIsSplitWithinSevenDayWindowsWithoutFromId() throws Exception {
        LocalDateTime start = LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusDays(8);
        long startMs = start.atZone(ZoneId.of("Asia/Seoul")).toInstant().toEpochMilli();
        long secondWindowTradeTime = startMs + TimeUnit.DAYS.toMillis(7) + 1;
        List<Long> tradeTimes = new ArrayList<>();
        for (int i = 0; i < 1001; i++) tradeTimes.add(startMs + i * TimeUnit.SECONDS.toMillis(1));
        tradeTimes.add(secondWindowTradeTime);

        try (MockWebServer server = new MockWebServer()) {
            List<long[]> requestedWindows = new ArrayList<>();
            server.setDispatcher(new Dispatcher() {
                @Override
                public MockResponse dispatch(RecordedRequest request) {
                    HttpUrl url = request.getRequestUrl();
                    if (url.encodedPath().equals("/fapi/v1/income")) {
                        return json("[{\"symbol\":\"BTCUSDT\"}]");
                    }
                    assertThat(url.queryParameter("fromId")).isNull();
                    long from = Long.parseLong(url.queryParameter("startTime"));
                    long to = Long.parseLong(url.queryParameter("endTime"));
                    requestedWindows.add(new long[]{from, to});
                    assertThat(to - from).isLessThan(TimeUnit.DAYS.toMillis(7));
                    StringBuilder body = new StringBuilder("[");
                    int count = 0;
                    for (int i = 0; i < tradeTimes.size() && count < 1000; i++) {
                        long time = tradeTimes.get(i);
                        if (time < from || time > to) continue;
                        if (count++ > 0) body.append(',');
                        body.append("{\"id\":").append(i + 1)
                                .append(",\"symbol\":\"BTCUSDT\",\"side\":\"BUY\",\"qty\":\"1\",\"price\":\"10\",\"commission\":\"0.1\",\"time\":")
                                .append(time).append('}');
                    }
                    return json(body.append(']').toString());
                }
            });
            server.start();

            List<BinanceClient.BinanceTrade> trades = client(server).getTrades("key", "secret", start);
            assertThat(trades).hasSize(1002);
            assertThat(trades).extracting(t -> t.id).doesNotHaveDuplicates();
            assertThat(requestedWindows).anySatisfy(window ->
                    assertThat(window[0]).isEqualTo(startMs + TimeUnit.DAYS.toMillis(7)));
            assertThat(requestedWindows.size()).isGreaterThan(2);
        }
    }

    private BinanceClient client(MockWebServer server) {
        BinanceClient client = new BinanceClient();
        ReflectionTestUtils.setField(client, "baseUrl", server.url("/").toString().replaceAll("/$", ""));
        return client;
    }

    private MockResponse json(String body) {
        return new MockResponse().setResponseCode(200).setBody(body);
    }
}
