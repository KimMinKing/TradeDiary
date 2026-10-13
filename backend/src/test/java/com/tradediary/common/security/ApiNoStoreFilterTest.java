package com.tradediary.common.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class ApiNoStoreFilterTest {
    private final ApiNoStoreFilter filter = new ApiNoStoreFilter();

    @Test
    void preventsApiPayloadsFromBeingCached() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/journals/1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader("Cache-Control")).contains("no-store", "private");
        assertThat(response.getHeader("Pragma")).isEqualTo("no-cache");
        assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(response.getHeader("Referrer-Policy")).isEqualTo("no-referrer");
    }

    @Test
    void leavesNonApiAssetsUntouched() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/assets/app.js");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader("Cache-Control")).isNull();
    }
}
