package com.swaminarayan.clinic.dto;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Handles the frontend's page / limit (limit may be the word "all") query parameters. */
public final class PageUtil {
    private PageUtil() {}

    public static boolean isAll(String limit) {
        return limit != null && limit.equalsIgnoreCase("all");
    }

    public static int intOr(String s, int def) {
        try {
            int v = Integer.parseInt(s);
            return v > 0 ? v : def;
        } catch (Exception e) {
            return def;
        }
    }

    public static Pageable pageable(String page, String limit, Sort sort) {
        if (isAll(limit)) return Pageable.unpaged(sort);
        return PageRequest.of(intOr(page, 1) - 1, Math.min(intOr(limit, 10), 1000), sort);
    }

    public static Map<String, Object> pagination(long total, String page, String limit) {
        Map<String, Object> m = new LinkedHashMap<>();
        boolean all = isAll(limit);
        int lim = all ? (int) Math.max(total, 1) : Math.min(intOr(limit, 10), 1000);
        m.put("total", total);
        m.put("page", all ? 1 : intOr(page, 1));
        m.put("limit", lim);
        m.put("totalPages", (int) Math.max(1, Math.ceil(total / (double) lim)));
        return m;
    }

    public static Map<String, Object> envelope(Page<?> p, List<?> rows, String page, String limit) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", rows);
        m.put("pagination", pagination(p.getTotalElements(), page, limit));
        return m;
    }
}
