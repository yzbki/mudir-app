package com.youzbaki.mudir.user;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Shared rules for account emails and passwords, used by sign-up and by managers adding employees,
 * so every path that creates an account stores and validates them the same way.
 */
public final class AccountRules {

    public static final int MIN_PASSWORD_LENGTH = 8;

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private AccountRules() {
    }

    /** Emails are stored trimmed and lower-cased, so one address always maps to one account. */
    public static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    /** Normalizes and validates; throws IllegalArgumentException with a user-facing message. */
    public static String requireValidEmail(String email) {
        String normalized = normalizeEmail(email);
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (!EMAIL.matcher(normalized).matches()) {
            throw new IllegalArgumentException("Please enter a valid email address");
        }
        return normalized;
    }

    public static String requireValidPassword(String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }
        return password;
    }

    public static String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        return name.trim();
    }
}
