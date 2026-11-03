package com.youzbaki.mudir.business.dto;

import com.youzbaki.mudir.business.BusinessRole;

public record BusinessMemberResponse(
        Long id,
        Long businessId,
        Long userId,
        String userName,
        BusinessRole role
) {}
