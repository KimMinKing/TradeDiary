package com.tradediary.exchange;

import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class UpbitClientWindowTest {

    @Test
    void fullResponseSplitsTimeRangeInsteadOfDroppingOlderOrders() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            AtomicInteger requests = new AtomicInteger();
            List<RecordedRequest> captured = new ArrayList<>();
            server.setDispatcher(new Dispatcher() {
                @Override
                public MockResponse dispatch(RecordedRequest request) {
                    synchronized (captured) {
                        captured.add(request);
                    }
                    int number = requests.incrementAndGet();
                    if (number == 1) {
                        StringBuilder full = new StringBuilder("[");
                        for (int i = 0; i < 1000; i++) {
                            if (i > 0) full.append(',');
                            full.append("{\"uuid\":\"root-").append(i).append("\"}");
                        }
                        return new MockResponse().setResponseCode(200).setBody(full.append(']').toString());
                    }
                    return new MockResponse().setResponseCode(200)
                            .setBody("[{\"uuid\":\"child-" + number + "\"}]");
                }
            });
            server.start();

            UpbitClient client = new UpbitClient();
            ReflectionTestUtils.setField(client, "baseUrl", server.url("/v1").toString().replaceAll("/$", ""));

            var orders = client.getClosedOrders("test-key", "test-secret",
                    LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusHours(12));

            assertThat(orders).extracting(order -> order.uuid)
                    .containsExactly("child-2", "child-3");
            assertThat(requests.get()).isEqualTo(3);
            assertThat(start(captured.get(0))).isEqualTo(start(captured.get(1)));
            assertThat(end(captured.get(1))).isEqualTo(start(captured.get(2)));
            assertThat(end(captured.get(0))).isEqualTo(end(captured.get(2)));
        }
    }

    private OffsetDateTime start(RecordedRequest request) {
        return OffsetDateTime.parse(request.getRequestUrl().queryParameter("start_time"));
    }

    private OffsetDateTime end(RecordedRequest request) {
        return OffsetDateTime.parse(request.getRequestUrl().queryParameter("end_time"));
    }
}
