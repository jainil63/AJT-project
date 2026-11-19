package com.swaminarayan.clinic.dto;

import com.swaminarayan.clinic.exception.ApiException;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Lenient readers for request values. The frontend sends blank strings for empty inputs,
 * so blank is always treated as "not provided" (null).
 */
public final class Params {
    private Params() {}

    public static String str(Map<String, ?> m, String key) {
        Object v = m.get(key);
        if (v == null) return null;
        String s = String.valueOf(v).trim();
        return s.isEmpty() || s.equals("null") || s.equals("undefined") ? null : s;
    }

    public static boolean bool(Map<String, ?> m, String key) {
        String s = str(m, key);
        return s != null && (s.equalsIgnoreCase("true") || s.equals("1"));
    }

    public static BigDecimal decimal(Map<String, ?> m, String key) {
        String s = str(m, key);
        if (s == null) return null;
        try {
            return new BigDecimal(s.replace(",", ""));
        } catch (NumberFormatException e) {
            throw ApiException.badRequest(key + " must be a valid number");
        }
    }

    public static Double dbl(Map<String, ?> m, String key) {
        BigDecimal d = decimal(m, key);
        return d == null ? null : d.doubleValue();
    }

    public static Integer integer(Map<String, ?> m, String key) {
        BigDecimal d = decimal(m, key);
        return d == null ? null : d.intValue();
    }

    private static final DateTimeFormatter DMY = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    /** Accepts yyyy-MM-dd, an ISO date-time (date part used) or dd-MM-yyyy. */
    public static LocalDate date(Map<String, ?> m, String key) {
        return parseDate(str(m, key), key);
    }

    public static LocalDate parseDate(String s, String key) {
        if (s == null) return null;
        try {
            if (s.length() >= 10 && s.charAt(4) == '-') return LocalDate.parse(s.substring(0, 10));
            return LocalDate.parse(s.substring(0, Math.min(10, s.length())), DMY);
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest(key + " must be a valid date (yyyy-MM-dd)");
        }
    }

    /** Accepts yyyy-MM-ddTHH:mm[:ss], a full ISO instant/offset time (converted to server zone), or a plain date. */
    public static LocalDateTime dateTime(Map<String, ?> m, String key) {
        String s = str(m, key);
        if (s == null) return null;
        try {
            if (s.length() == 10) return LocalDate.parse(s).atTime(LocalTime.now().withNano(0));
            if (s.endsWith("Z") || s.matches(".*[+-]\\d{2}:?\\d{2}$"))
                return OffsetDateTime.parse(s).atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
            return LocalDateTime.parse(s.replace(' ', 'T'));
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest(key + " must be a valid date-time");
        }
    }

    public static List<String> csv(String s) {
        if (s == null || s.isBlank()) return List.of();
        List<String> out = new ArrayList<>();
        for (String p : s.split(",")) if (!p.isBlank()) out.add(p.trim());
        return out;
    }
}
