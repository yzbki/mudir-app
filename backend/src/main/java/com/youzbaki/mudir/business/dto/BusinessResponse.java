package com.youzbaki.mudir.business.dto;

public record BusinessResponse(
        Long id,
        String name,
        Long ownerId,
        String ownerName,
        String address,
        String phone,
        String description
) {}
