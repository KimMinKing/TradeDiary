package com.tradediary.exchange;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class KrakenClientTest {
    @Test
    void createsDeterministicPrivateApiSignature() {
        KrakenClient client = new KrakenClient();
        long nonce = 1616492376594L;

        String signature = client.sign(
                "/0/private/Balance",
                "nonce=" + nonce,
                nonce,
                "c2VjcmV0"
        );

        assertThat(signature).isEqualTo(
                "LmSOE3hjCtPuHQpAqWPWGK8oOYxW/WqO7PWMv5PAorZkNGmhVQIH/jS9cgylO0cf0mSCmMhVVKqekQ+vaxpBUw=="
        );
    }
}
