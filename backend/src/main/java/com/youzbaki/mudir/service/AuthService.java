package com.youzbaki.mudir.service;

import com.youzbaki.mudir.auth.GoogleTokenVerifier;
import com.youzbaki.mudir.auth.dto.AuthResponse;
import com.youzbaki.mudir.auth.dto.LoginRequest;
import com.youzbaki.mudir.auth.dto.RegisterRequest;
import com.youzbaki.mudir.auth.dto.UserResponse;
import com.youzbaki.mudir.security.JwtService;
import com.youzbaki.mudir.user.AccountRules;
import com.youzbaki.mudir.user.EmailAlreadyRegisteredException;
import com.youzbaki.mudir.user.User;
import com.youzbaki.mudir.user.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            GoogleTokenVerifier googleTokenVerifier) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleTokenVerifier = googleTokenVerifier;
    }

    /**
     * Creates a password account. One email = one account: this rejects any email that already has an
     * account, however it was created (sign-up, Google login, or a manager adding an employee).
     */
    public AuthResponse register(RegisterRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Name, email and password are required");
        }

        String name = AccountRules.requireName(request.name());
        String normalizedEmail = AccountRules.requireValidEmail(request.email());
        String password = AccountRules.requireValidPassword(request.password());

        if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw new EmailAlreadyRegisteredException();
        }

        User user = new User(normalizedEmail, passwordEncoder.encode(password), name);

        try {
            // saveAndFlush so the unique constraint fires here, not at commit, if a concurrent
            // sign-up for the same email slipped past the check above.
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw new EmailAlreadyRegisteredException();
        }

        String token = jwtService.generateToken(user.getEmail());

        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail()
        );
    }

    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.email());

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (user.getPassword() == null || !passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtService.generateToken(user.getEmail());

        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail()
        );
    }

    public AuthResponse loginWithGoogle(String credential) {
        GoogleTokenVerifier.VerifiedGoogleUser googleUser = googleTokenVerifier.verify(credential);
        String normalizedEmail = normalizeEmail(googleUser.email());

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseGet(() -> userRepository.save(new User(
                        normalizedEmail,
                        null,
                        googleUser.name() != null
                                ? googleUser.name()
                                : buildDisplayNameFromEmail(normalizedEmail)
                )));

        String token = jwtService.generateToken(user.getEmail());

        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail()
        );
    }

    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail()
        );
    }

    public UserResponse updateAccountName(String email, String newName) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (newName == null || newName.trim().isEmpty()) {
            throw new IllegalArgumentException("Account name is required");
        }

        user.setName(newName.trim());
        userRepository.save(user);

        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail()
        );
    }

    public void deleteAccount(String email) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        userRepository.delete(user);
    }

    private String normalizeEmail(String email) {
        return AccountRules.normalizeEmail(email);
    }

    private String buildDisplayNameFromEmail(String email) {
        String localPart = email.substring(0, email.indexOf('@'));
        return localPart.substring(0, 1).toUpperCase(Locale.ROOT) + localPart.substring(1);
    }
}
