package com.youzbaki.mudir.business.dto;

import java.util.List;

public record BusinessResponse(
        Long id,
        String name,
        Long ownerId,
        String ownerName,
        String address,
        String phone,
        String description,
        List<String> enabledPages
) {}
