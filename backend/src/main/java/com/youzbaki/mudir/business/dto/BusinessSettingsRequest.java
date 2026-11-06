package com.youzbaki.mudir.business.dto;

import java.util.List;

public record BusinessSettingsRequest(
        List<String> enabledPages
) {}
