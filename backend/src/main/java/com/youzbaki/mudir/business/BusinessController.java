package com.youzbaki.mudir.business;

import com.youzbaki.mudir.business.dto.BusinessCreateRequest;
import com.youzbaki.mudir.business.dto.BusinessMemberRequest;
import com.youzbaki.mudir.business.dto.BusinessMemberResponse;
import com.youzbaki.mudir.business.dto.BusinessResponse;
import com.youzbaki.mudir.user.User;
import com.youzbaki.mudir.user.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/businesses")
public class BusinessController {

    private final BusinessService businessService;
    private final UserService userService;

    public BusinessController(BusinessService businessService, UserService userService) {
        this.businessService = businessService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<?> createBusiness(
            Authentication authentication,
            @RequestBody BusinessCreateRequest request) {
        try {
            User user = userService.getUserByEmail(authentication.getName());
            return ResponseEntity.ok(businessService.createBusiness(user, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<BusinessResponse>> getBusinesses(Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName());
        return ResponseEntity.ok(businessService.getBusinessesForUser(user));
    }

    @PostMapping("/{businessId}/employees")
    public ResponseEntity<?> assignEmployee(
            Authentication authentication,
            @PathVariable Long businessId,
            @RequestBody BusinessMemberRequest request) {
        try {
            User actor = userService.getUserByEmail(authentication.getName());
            BusinessMemberResponse response = businessService.assignEmployee(actor, businessId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
