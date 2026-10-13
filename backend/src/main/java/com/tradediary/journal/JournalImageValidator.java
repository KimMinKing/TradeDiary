package com.tradediary.journal;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import org.springframework.stereotype.Component;
import java.util.Base64;
import java.util.Locale;

@Component
public class JournalImageValidator {
    static final int MAX_IMAGE_BYTES = 1_572_864;

    public String validate(String dataUri) {
        if (dataUri == null || dataUri.isBlank()) return null;
        if (dataUri.length() > 2_200_000) throw new BusinessException(ErrorCode.JOURNAL_IMAGE_TOO_LARGE);
        int comma = dataUri.indexOf(',');
        if (comma < 0) throw invalidImage();
        String mime = switch (dataUri.substring(0, comma).toLowerCase(Locale.ROOT)) {
            case "data:image/jpeg;base64" -> "jpeg";
            case "data:image/png;base64" -> "png";
            case "data:image/webp;base64" -> "webp";
            default -> throw invalidImage();
        };
        final byte[] bytes;
        try { bytes = Base64.getDecoder().decode(dataUri.substring(comma + 1)); }
        catch (IllegalArgumentException exception) { throw invalidImage(); }
        if (bytes.length > MAX_IMAGE_BYTES) throw new BusinessException(ErrorCode.JOURNAL_IMAGE_TOO_LARGE);
        if (!hasExpectedSignature(bytes, mime)) throw invalidImage();
        return dataUri;
    }

    private boolean hasExpectedSignature(byte[] bytes, String mime) {
        return switch (mime) {
            case "jpeg" -> bytes.length >= 3 && u(bytes[0]) == 0xff && u(bytes[1]) == 0xd8 && u(bytes[2]) == 0xff;
            case "png" -> bytes.length >= 8 && u(bytes[0]) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e
                    && bytes[3] == 0x47 && bytes[4] == 0x0d && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a;
            case "webp" -> bytes.length >= 12 && ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP");
            default -> false;
        };
    }

    private boolean ascii(byte[] bytes, int offset, String expected) {
        for (int i = 0; i < expected.length(); i++) if (bytes[offset + i] != expected.charAt(i)) return false;
        return true;
    }

    private int u(byte value) { return value & 0xff; }
    private BusinessException invalidImage() { return new BusinessException(ErrorCode.INVALID_JOURNAL_IMAGE); }
}
