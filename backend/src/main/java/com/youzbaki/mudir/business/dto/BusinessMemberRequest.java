package com.youzbaki.mudir.business.dto;

import com.youzbaki.mudir.business.BusinessRole;

/**
 * Adds a member (by userId or email) or changes an existing member's role/title.
 * {@code password} is only used when the email has no account yet and a new one is created;
 * it is ignored for existing accounts.
 */
public record BusinessMemberRequest(
        Long userId,
        BusinessRole role,
        String email,
        String name,
        String title,
        String password
) {}
