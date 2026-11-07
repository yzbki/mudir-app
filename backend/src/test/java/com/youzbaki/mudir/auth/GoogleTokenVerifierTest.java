package com.youzbaki.mudir.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertThrows;

class GoogleTokenVerifierTest {

    private static final String CLIENT_ID = "test-client-id.apps.googleusercontent.com";

    private final GoogleTokenVerifier verifier = new GoogleTokenVerifier(CLIENT_ID);

    @Test
    void rejectsMissingCredential() {
        assertThrows(BadCredentialsException.class, () -> verifier.verify(null));
        assertThrows(BadCredentialsException.class, () -> verifier.verify("  "));
    }

    @Test
    void rejectsGarbageCredential() {
        assertThrows(BadCredentialsException.class, () -> verifier.verify("not-a-jwt"));
    }

    @Test
    void rejectsForgedTokenWithCorrectClaimsButNoValidSignature() {
        long now = System.currentTimeMillis() / 1000;
        String token = forge("""
                {"iss":"https://accounts.google.com","aud":"%s","sub":"1",
                 "email":"victim@example.com","email_verified":true,
                 "iat":%d,"exp":%d}""".formatted(CLIENT_ID, now, now + 3600));

        assertThrows(BadCredentialsException.class, () -> verifier.verify(token));
    }

    @Test
    void rejectsTokenIssuedForAnotherClient() {
        long now = System.currentTimeMillis() / 1000;
        String token = forge("""
                {"iss":"https://accounts.google.com","aud":"someone-else","sub":"1",
                 "email":"victim@example.com","email_verified":true,
                 "iat":%d,"exp":%d}""".formatted(now, now + 3600));

        assertThrows(BadCredentialsException.class, () -> verifier.verify(token));
    }

    private static String forge(String payloadJson) {
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        String header = enc.encodeToString("{\"alg\":\"RS256\",\"kid\":\"forged\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = enc.encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
        String signature = enc.encodeToString("bogus-signature".getBytes(StandardCharsets.UTF_8));
        return header + "." + payload + "." + signature;
    }
}
