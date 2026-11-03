package com.youzbaki.mudir.auth.dto;

public record LoginRequest(
        String email,
        String password
) {}
