package com.youzbaki.mudir.business.dto;

import com.youzbaki.mudir.business.BusinessRole;

public record BusinessMemberRequest(
        Long userId,
        BusinessRole role,
        String email,
        String name,
        String title
) {}
