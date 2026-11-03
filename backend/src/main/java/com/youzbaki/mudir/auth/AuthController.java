package com.youzbaki.mudir.auth;

import com.youzbaki.mudir.auth.dto.AuthResponse;
import com.youzbaki.mudir.auth.dto.LoginRequest;
import com.youzbaki.mudir.auth.dto.RegisterRequest;
import com.youzbaki.mudir.auth.dto.UserResponse;
import com.youzbaki.mudir.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            return ResponseEntity.ok(authService.register(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(
            org.springframework.security.core.Authentication authentication) {
        try {
            String email = authentication.getName();
            return ResponseEntity.ok(authService.getCurrentUser(email));
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount(
            org.springframework.security.core.Authentication authentication) {
        try {
            String email = authentication.getName();
            authService.deleteAccount(email);
            return ResponseEntity.ok("Account deleted");
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }
}