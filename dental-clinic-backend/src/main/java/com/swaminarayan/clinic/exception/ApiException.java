package com.swaminarayan.clinic.exception;

import org.springframework.http.HttpStatus;

/** Business error that is returned to the client as {success:false, message}. */
public class ApiException extends RuntimeException {
    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() { return status; }

    public static ApiException badRequest(String m) { return new ApiException(HttpStatus.BAD_REQUEST, m); }
    public static ApiException notFound(String m)   { return new ApiException(HttpStatus.NOT_FOUND, m); }
    public static ApiException conflict(String m)   { return new ApiException(HttpStatus.CONFLICT, m); }
    public static ApiException unauthorized(String m) { return new ApiException(HttpStatus.UNAUTHORIZED, m); }
}
