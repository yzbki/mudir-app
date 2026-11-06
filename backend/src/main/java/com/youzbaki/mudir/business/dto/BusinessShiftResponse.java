package com.youzbaki.mudir.business.dto;

import java.time.LocalDate;

public record BusinessShiftResponse(
        Long id,
        Long businessId,
        Long userId,
        String userName,
        String title,
        String role,
        LocalDate date,
        String startTime,
        String endTime
) {}
