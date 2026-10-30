package com.tradediary.portfolio;

public class TooManyPublicRequestsException extends RuntimeException {
    public TooManyPublicRequestsException(String message) { super(message); }
}
