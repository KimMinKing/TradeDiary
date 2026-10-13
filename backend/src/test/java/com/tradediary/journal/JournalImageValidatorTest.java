package com.tradediary.journal;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import java.util.Base64;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JournalImageValidatorTest {
    private final JournalImageValidator validator = new JournalImageValidator();

    @Test
    void acceptsSupportedImageWithMatchingSignature() {
        String image = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(
                new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff, 0x00});
        assertThat(validator.validate(image)).isEqualTo(image);
    }

    @Test
    void rejectsSvgAndSpoofedMimeType() {
        String svg = "data:image/svg+xml;base64," + Base64.getEncoder().encodeToString("<svg/>".getBytes());
        String spoofedPng = "data:image/png;base64," + Base64.getEncoder().encodeToString("not png".getBytes());
        assertError(svg, ErrorCode.INVALID_JOURNAL_IMAGE);
        assertError(spoofedPng, ErrorCode.INVALID_JOURNAL_IMAGE);
    }

    @Test
    void rejectsDecodedPayloadOverLimit() {
        byte[] bytes = new byte[JournalImageValidator.MAX_IMAGE_BYTES + 1];
        bytes[0] = (byte) 0xff; bytes[1] = (byte) 0xd8; bytes[2] = (byte) 0xff;
        assertError("data:image/jpeg;base64," + Base64.getEncoder().encodeToString(bytes),
                ErrorCode.JOURNAL_IMAGE_TOO_LARGE);
    }

    private void assertError(String image, ErrorCode expected) {
        assertThatThrownBy(() -> validator.validate(image))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(expected));
    }
}
