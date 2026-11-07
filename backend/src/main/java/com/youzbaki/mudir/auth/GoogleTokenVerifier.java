package com.youzbaki.mudir.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Verifies Google ID tokens server-side: signature (against Google's rotating public keys),
 * issuer, expiry, audience (must be our OAuth client ID) and that the email is verified.
 */
@Component
public class GoogleTokenVerifier {

    public record VerifiedGoogleUser(String email, String name) {
    }

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifier(@Value("${google.client-id}") String clientId) {
        if (clientId == null || clientId.isBlank()) {
            throw new IllegalStateException("google.client-id (GOOGLE_CLIENT_ID) must be configured");
        }
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(List.of(clientId.trim()))
                .build();
    }

    public VerifiedGoogleUser verify(String credential) {
        if (credential == null || credential.isBlank()) {
            throw new BadCredentialsException("Google credential is required");
        }

        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(credential);
        } catch (Exception e) {
            throw new BadCredentialsException("Invalid Google credential");
        }

        if (idToken == null) {
            throw new BadCredentialsException("Invalid Google credential");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String email = payload.getEmail();

        if (email == null || email.isBlank() || !Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new BadCredentialsException("Google account email is not verified");
        }

        Object name = payload.get("name");
        return new VerifiedGoogleUser(email, name instanceof String s && !s.isBlank() ? s.trim() : null);
    }
}
