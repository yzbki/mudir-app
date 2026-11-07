package com.youzbaki.mudir.auth.dto;

/**
 * Carries the raw Google ID token (the "credential" returned by Google Identity Services).
 * The backend verifies it; the client never asserts an email on its own.
 */
public record GoogleLoginRequest(String credential) {
}
