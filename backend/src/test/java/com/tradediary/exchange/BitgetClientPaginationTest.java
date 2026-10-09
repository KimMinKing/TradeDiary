package com.tradediary.exchange;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class BitgetClientPaginationTest {

    @Test
    void mergesFillsForOneOrderAcrossPageBoundary() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.enqueue(page("101", "100", "0.1", "99"));
            server.enqueue(page("100", "120", "0.2", ""));
            server.start();
            BitgetClient client = new BitgetClient();
            ReflectionTestUtils.setField(client, "baseUrl",
                    server.url("/").toString().replaceAll("/$", ""));

            var orders = client.getOrders("key", "secret", "passphrase",
                    LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusHours(1));

            assertThat(orders).hasSize(1);
            assertThat(orders.get(0).orderId).isEqualTo("same-order");
            assertThat(orders.get(0).filledQty).isEqualTo("2");
            assertThat(orders.get(0).priceAvg).isEqualTo("110.00000000");
            assertThat(orders.get(0).fee).isEqualTo("0.3");
            assertThat(server.takeRequest().getRequestUrl().queryParameter("idLessThan")).isNull();
            assertThat(server.takeRequest().getRequestUrl().queryParameter("idLessThan")).isEqualTo("99");
        }
    }

    private MockResponse page(String tradeId, String price, String fee, String endId) {
        String body = """
                {"code":"00000","data":{"fillList":[{"tradeId":"%s","orderId":"same-order",
                "symbol":"BTCUSDT","side":"buy","tradeSide":"open","baseVolume":"1",
                "price":"%s","fee":"%s","cTime":"1700000000000"}],"endId":"%s"}}
                """.formatted(tradeId, price, fee, endId);
        return new MockResponse().setResponseCode(200).setBody(body);
    }
}
