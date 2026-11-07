package com.youzbaki.mudir.service;

import com.youzbaki.mudir.auth.GoogleTokenVerifier;
import com.youzbaki.mudir.auth.dto.LoginRequest;
import com.youzbaki.mudir.auth.dto.RegisterRequest;
import com.youzbaki.mudir.security.JwtService;
import com.youzbaki.mudir.user.EmailAlreadyRegisteredException;
import com.youzbaki.mudir.user.User;
import com.youzbaki.mudir.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceRegisterTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        JwtService jwtService = mock(JwtService.class);
        when(jwtService.generateToken(anyString())).thenReturn("token");
        authService = new AuthService(userRepository, passwordEncoder, jwtService, mock(GoogleTokenVerifier.class));

        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 42L);
            return saved;
        });
    }

    @Test
    void rejectsEmailThatAlreadyHasPasswordAccount() {
        when(userRepository.findByEmailIgnoreCase("sara@example.com"))
                .thenReturn(Optional.of(new User("sara@example.com", "hash", "Sara")));

        assertThrows(EmailAlreadyRegisteredException.class,
                () -> authService.register(new RegisterRequest("  Sara@Example.COM ", "password123", "Sara")));
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsEmailThatAlreadyHasGoogleAccount() {
        // Google accounts are stored with no password.
        when(userRepository.findByEmailIgnoreCase("omar@gmail.com"))
                .thenReturn(Optional.of(new User("omar@gmail.com", null, "Omar")));

        assertThrows(EmailAlreadyRegisteredException.class,
                () -> authService.register(new RegisterRequest("omar@gmail.com", "password123", "Someone Else")));
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void concurrentDuplicateHittingUniqueConstraintIsReportedAsDuplicate() {
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        assertThrows(EmailAlreadyRegisteredException.class,
                () -> authService.register(new RegisterRequest("new@example.com", "password123", "New")));
    }

    @Test
    void rejectsInvalidInput() {
        assertThrows(IllegalArgumentException.class,
                () -> authService.register(new RegisterRequest("new@example.com", "short", "New")));
        assertThrows(IllegalArgumentException.class,
                () -> authService.register(new RegisterRequest("not-an-email", "password123", "New")));
        assertThrows(IllegalArgumentException.class,
                () -> authService.register(new RegisterRequest("new@example.com", "password123", "  ")));
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void createsAccountWithNormalizedEmailAndHashedPassword() {
        authService.register(new RegisterRequest("  New@Example.COM ", "password123", "  New Person "));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(saved.capture());
        assertEquals("new@example.com", saved.getValue().getEmail());
        assertEquals("New Person", saved.getValue().getName());
        assertNotEquals("password123", saved.getValue().getPassword());
        assertTrue(passwordEncoder.matches("password123", saved.getValue().getPassword()));
    }

    @Test
    void registeredAccountCanLogIn() {
        authService.register(new RegisterRequest("new@example.com", "password123", "New"));
        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(saved.capture());
        when(userRepository.findByEmailIgnoreCase("new@example.com")).thenReturn(Optional.of(saved.getValue()));

        assertEquals("new@example.com", authService.login(new LoginRequest("New@example.com", "password123")).email());
    }
}
