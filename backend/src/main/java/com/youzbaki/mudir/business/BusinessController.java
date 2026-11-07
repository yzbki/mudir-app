package com.youzbaki.mudir.business;

import com.youzbaki.mudir.business.dto.BusinessCreateRequest;
import com.youzbaki.mudir.business.dto.BusinessDetailsRequest;
import com.youzbaki.mudir.business.dto.BusinessMemberColorRequest;
import com.youzbaki.mudir.business.dto.BusinessMemberRequest;
import com.youzbaki.mudir.business.dto.BusinessMemberResponse;
import com.youzbaki.mudir.business.dto.BusinessResponse;
import com.youzbaki.mudir.business.dto.BusinessSettingsRequest;
import com.youzbaki.mudir.business.dto.BusinessShiftRequest;
import com.youzbaki.mudir.business.dto.BusinessShiftResponse;
import com.youzbaki.mudir.user.User;
import com.youzbaki.mudir.user.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    @GetMapping("/{businessId}/members")
    public ResponseEntity<?> getMembers(
            Authentication authentication,
            @PathVariable Long businessId) {
        try {
            User actor = userService.getUserByEmail(authentication.getName());
            return ResponseEntity.ok(businessService.getMembersForBusiness(actor, businessId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
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

    @PutMapping("/{businessId}/members/{userId}/color")
    public ResponseEntity<?> updateMemberColor(
            Authentication authentication,
            @PathVariable Long businessId,
            @PathVariable Long userId,
            @RequestBody BusinessMemberColorRequest request) {
        try {
            User actor = userService.getUserByEmail(authentication.getName());
            return ResponseEntity.ok(businessService.updateMemberColor(actor, businessId, userId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{businessId}/details")
    public ResponseEntity<?> updateBusinessDetails(
            Authentication authentication,
            @PathVariable Long businessId,
            @RequestBody BusinessDetailsRequest request) {
        try {
            User actor = userService.getUserByEmail(authentication.getName());
            BusinessResponse response = businessService.updateBusinessDetails(actor, businessId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{businessId}/settings")
    public ResponseEntity<?> updateBusinessSettings(
            Authentication authentication,
            @PathVariable Long businessId,
            @RequestBody BusinessSettingsRequest request) {
        try {
            User actor = userService.getUserByEmail(authentication.getName());
            BusinessResponse response = businessService.updateBusinessSettings(actor, businessId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{businessId}")
    public ResponseEntity<?> deleteBusiness(
            Authentication authentication,
            @PathVariable Long businessId) {
        try {
            User actor = userService.getUserByEmail(authentication.getName());
            businessService.deleteBusiness(actor, businessId);
            return ResponseEntity.ok(Map.of("message", "Business deleted"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{businessId}/employees/{userId}")
    public ResponseEntity<?> removeEmployee(
            Authentication authentication,
            @PathVariable Long businessId,
            @PathVariable Long userId) {
        try {
            User actor = userService.getUserByEmail(authentication.getName());
            businessService.removeEmployee(actor, businessId, userId);
            return ResponseEntity.ok(Map.of("message", "Employee removed"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{businessId}/shifts")
    public ResponseEntity<?> getShifts(
            Authentication authentication,
            @PathVariable Long businessId) {
        try {
            User actor = userService.getUserByEmail(authentication.getName());
            return ResponseEntity.ok(businessService.getShiftsForBusiness(actor, businessId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{businessId}/shifts")
    public ResponseEntity<?> createShift(
            Authentication authentication,
            @PathVariable Long businessId,
            @RequestBody BusinessShiftRequest request) {
        try {
            User actor = userService.getUserByEmail(authentication.getName());
            BusinessShiftResponse response = businessService.createShift(actor, businessId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{businessId}/shifts/{shiftId}")
    public ResponseEntity<?> updateShift(
            Authentication authentication,
            @PathVariable Long businessId,
            @PathVariable Long shiftId,
            @RequestBody BusinessShiftRequest request) {
        try {
            User actor = userService.getUserByEmail(authentication.getName());
            BusinessShiftResponse response = businessService.updateShift(actor, businessId, shiftId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{businessId}/shifts/{shiftId}")
    public ResponseEntity<?> deleteShift(
            Authentication authentication,
            @PathVariable Long businessId,
            @PathVariable Long shiftId) {
        try {
            User actor = userService.getUserByEmail(authentication.getName());
            businessService.deleteShift(actor, businessId, shiftId);
            return ResponseEntity.ok(Map.of("message", "Shift deleted"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
