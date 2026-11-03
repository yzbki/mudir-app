package com.youzbaki.mudir.service;

import com.youzbaki.mudir.auth.dto.AuthResponse;
import com.youzbaki.mudir.auth.dto.LoginRequest;
import com.youzbaki.mudir.auth.dto.RegisterRequest;
import com.youzbaki.mudir.auth.dto.UserResponse;
import com.youzbaki.mudir.security.JwtService;
import com.youzbaki.mudir.user.User;
import com.youzbaki.mudir.user.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User(
                request.email(),
                passwordEncoder.encode(request.password()),
                request.name()
        );

        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());

        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail()
        );
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
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

    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail()
        );
    }

    public void deleteAccount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        userRepository.delete(user);
    }
}
