package com.youzbaki.mudir.business.dto;

import java.time.LocalDate;

public record BusinessShiftRequest(
        Long userId,
        LocalDate date,
        String startTime,
        String endTime
) {}
