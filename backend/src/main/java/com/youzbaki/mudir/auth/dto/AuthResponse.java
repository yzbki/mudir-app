package com.youzbaki.mudir.auth.dto;

public record AuthResponse(
        String token,
        Long id,
        String name,
        String email
) {}
