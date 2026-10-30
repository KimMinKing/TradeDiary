package com.tradediary.exchange;

import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.concurrent.CompletionException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BybitClientFailureTest {

    @Test
    void failedCategoryFailsEntireImportEvenWhenAnotherCategoryHasExecutions() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.setDispatcher(new Dispatcher() {
                @Override
                public MockResponse dispatch(RecordedRequest request) {
                    if ("inverse".equals(request.getRequestUrl().queryParameter("category"))) {
                        return new MockResponse().setResponseCode(401).setBody("unauthorized");
                    }
                    return new MockResponse().setResponseCode(200).setBody("""
                            {"retCode":0,"result":{"list":[{"execId":"linear-trade"}],"nextPageCursor":""}}
                            """);
                }
            });
            server.start();

            BybitClient client = new BybitClient();
            ReflectionTestUtils.setField(client, "baseUrl", server.url("/").toString().replaceAll("/$", ""));

            assertThatThrownBy(() -> client.getExecutions("test-key", "test-secret",
                    LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusHours(1)))
                    .isInstanceOf(CompletionException.class)
                    .hasRootCauseInstanceOf(RuntimeException.class)
                    .rootCause().hasMessageContaining("HTTP 401");
            assertThat(server.getRequestCount()).isEqualTo(2);
        }
    }
}
