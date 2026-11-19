package com.swaminarayan.clinic.dto;

import java.util.LinkedHashMap;
import java.util.Map;

/** Builds the {success, message, data} envelope the React frontend expects. */
public final class ApiResponse {
    private ApiResponse() {}

    public static Map<String, Object> ok(String message, Object data) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("message", message);
        m.put("data", data);
        return m;
    }

    public static Map<String, Object> ok(Object data) {
        return ok("OK", data);
    }

    public static Map<String, Object> message(String message) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("message", message);
        return m;
    }
}
