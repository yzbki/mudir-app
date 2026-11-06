package com.youzbaki.mudir.business;

import com.youzbaki.mudir.business.dto.BusinessCreateRequest;
import com.youzbaki.mudir.business.dto.BusinessDetailsRequest;
import com.youzbaki.mudir.business.dto.BusinessMemberRequest;
import com.youzbaki.mudir.business.dto.BusinessMemberResponse;
import com.youzbaki.mudir.business.dto.BusinessResponse;
import com.youzbaki.mudir.business.dto.BusinessSettingsRequest;
import com.youzbaki.mudir.business.dto.BusinessShiftRequest;
import com.youzbaki.mudir.business.dto.BusinessShiftResponse;
import com.youzbaki.mudir.user.User;
import com.youzbaki.mudir.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class BusinessService {

    private static final Set<String> REQUIRED_PAGE_KEYS = Set.of("dashboard", "employees", "profile");
    private static final Set<String> OPTIONAL_PAGE_KEYS = Set.of("schedule", "inventory", "tasks", "customers");

    private final BusinessRepository businessRepository;
    private final BusinessMemberRepository businessMemberRepository;
    private final BusinessShiftRepository businessShiftRepository;
    private final UserRepository userRepository;

    public BusinessService(
            BusinessRepository businessRepository,
            BusinessMemberRepository businessMemberRepository,
            BusinessShiftRepository businessShiftRepository,
            UserRepository userRepository) {
        this.businessRepository = businessRepository;
        this.businessMemberRepository = businessMemberRepository;
        this.businessShiftRepository = businessShiftRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public BusinessResponse createBusiness(User owner, BusinessCreateRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new IllegalArgumentException("Business name is required");
        }

        Business business = new Business(request.name().trim(), owner);
        Business savedBusiness = businessRepository.save(business);

        BusinessMember ownerMember = new BusinessMember(savedBusiness, owner, BusinessRole.OWNER);
        businessMemberRepository.save(ownerMember);

        return toBusinessResponse(savedBusiness);
    }

    public List<BusinessResponse> getBusinessesForUser(User user) {
        Set<Business> businesses = new LinkedHashSet<>();
        businesses.addAll(businessRepository.findAllByOwner(user));
        businesses.addAll(businessRepository.findAllByMembersUser(user));

        return businesses.stream()
                .map(this::toBusinessResponse)
                .toList();
    }

    public List<BusinessMemberResponse> getMembersForBusiness(User actor, Long businessId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found"));

        if (!isBusinessMember(actor, business)) {
            throw new IllegalArgumentException("You do not have access to this business");
        }

        return businessMemberRepository.findByBusiness(business).stream()
                .map(this::toMemberResponse)
                .toList();
    }

    @Transactional
    public BusinessMemberResponse assignEmployee(User actor, Long businessId, BusinessMemberRequest request) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found"));

        if (!isOwnerOrManager(actor, business)) {
            throw new IllegalArgumentException("Only the business owner or a manager can assign employees");
        }

        if (request.role() == null) {
            throw new IllegalArgumentException("Role is required");
        }

        if (request.role() == BusinessRole.OWNER) {
            throw new IllegalArgumentException("Cannot assign OWNER role to another user");
        }

        String normalizedEmail = request.email() == null ? null : request.email().trim().toLowerCase();

        User targetUser;
        if (request.userId() != null) {
            targetUser = userRepository.findById(request.userId())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
        } else if (normalizedEmail != null && !normalizedEmail.isBlank()) {
            targetUser = userRepository.findByEmail(normalizedEmail)
                    .orElseGet(() -> {
                        String displayName = request.name() == null || request.name().isBlank()
                                ? buildDisplayNameFromEmail(normalizedEmail)
                                : request.name().trim();
                        return userRepository.save(new User(normalizedEmail, null, displayName));
                    });
        } else {
            throw new IllegalArgumentException("User ID or email is required");
        }

        if (targetUser.getId().equals(business.getOwner().getId())) {
            throw new IllegalArgumentException("Owner cannot be reassigned");
        }

        if (targetUser.getId().equals(actor.getId())) {
            throw new IllegalArgumentException("You cannot change your own role");
        }

        BusinessMember existing = businessMemberRepository.findByBusinessAndUser(business, targetUser)
                .orElseGet(() -> new BusinessMember(business, targetUser, request.role()));

        existing.setRole(request.role());
        if (request.title() != null) {
            existing.setTitle(request.title());
        }

        BusinessMember saved = businessMemberRepository.save(existing);

        return toMemberResponse(saved);
    }

    @Transactional
    public BusinessResponse updateBusinessDetails(User actor, Long businessId, BusinessDetailsRequest request) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found"));

        if (!isBusinessOwner(actor, business)) {
            throw new IllegalArgumentException("Only the business owner can update business details");
        }

        if (request != null) {
            if (request.address() != null) {
                business.setAddress(request.address().trim().isEmpty() ? null : request.address().trim());
            }
            if (request.phone() != null) {
                business.setPhone(request.phone().trim().isEmpty() ? null : request.phone().trim());
            }
            if (request.description() != null) {
                business.setDescription(request.description().trim().isEmpty() ? null : request.description().trim());
            }
        }

        Business savedBusiness = businessRepository.save(business);
        return toBusinessResponse(savedBusiness);
    }

    @Transactional
    public BusinessResponse updateBusinessSettings(User actor, Long businessId, BusinessSettingsRequest request) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found"));

        if (!business.getOwner().getId().equals(actor.getId())) {
            throw new IllegalArgumentException("Only the business owner can update business settings");
        }

        if (request == null || request.enabledPages() == null) {
            business.setEnabledPages(new LinkedHashSet<>(REQUIRED_PAGE_KEYS));
            return toBusinessResponse(businessRepository.save(business));
        }

        Set<String> normalizedPages = new LinkedHashSet<>();
        normalizedPages.addAll(REQUIRED_PAGE_KEYS);

        for (String pageKey : request.enabledPages()) {
            if (pageKey == null) {
                continue;
            }
            String normalized = pageKey.trim();
            if (normalized.isEmpty()) {
                continue;
            }
            if (OPTIONAL_PAGE_KEYS.contains(normalized) || REQUIRED_PAGE_KEYS.contains(normalized)) {
                normalizedPages.add(normalized);
            }
        }

        business.setEnabledPages(normalizedPages);
        return toBusinessResponse(businessRepository.save(business));
    }

    @Transactional
    public void deleteBusiness(User actor, Long businessId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found"));

        if (!business.getOwner().getId().equals(actor.getId())) {
            throw new IllegalArgumentException("Only the business owner can delete this business");
        }

        businessRepository.delete(business);
    }

    @Transactional
    public void removeEmployee(User actor, Long businessId, Long userId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found"));

        if (!isOwnerOrManager(actor, business)) {
            throw new IllegalArgumentException("Only the business owner or a manager can remove employees");
        }

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (targetUser.getId().equals(business.getOwner().getId())) {
            throw new IllegalArgumentException("Owner cannot be removed");
        }

        if (targetUser.getId().equals(actor.getId())) {
            throw new IllegalArgumentException("You cannot remove yourself");
        }

        BusinessMember member = businessMemberRepository.findByBusinessAndUser(business, targetUser)
                .orElseThrow(() -> new IllegalArgumentException("Employee is not assigned to this business"));

        businessMemberRepository.delete(member);
    }

    @Transactional
    public BusinessShiftResponse createShift(User actor, Long businessId, BusinessShiftRequest request) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found"));

        if (!isOwnerOrManager(actor, business)) {
            throw new IllegalArgumentException("Only the business owner or a manager can schedule shifts");
        }

        if (request.userId() == null) {
            throw new IllegalArgumentException("Employee is required");
        }

        if (request.date() == null) {
            throw new IllegalArgumentException("Shift date is required");
        }

        String startTime = request.startTime() == null ? "" : request.startTime().trim();
        String endTime = request.endTime() == null ? "" : request.endTime().trim();

        if (startTime.isEmpty() || endTime.isEmpty()) {
            throw new IllegalArgumentException("Shift start and end times are required");
        }

        User targetUser = userRepository.findById(request.userId())
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        BusinessMember membership = businessMemberRepository.findByBusinessAndUser(business, targetUser)
                .orElseThrow(() -> new IllegalArgumentException("Employee is not assigned to this business"));

        if (businessShiftRepository.existsByBusinessAndUserAndDate(business, targetUser, request.date())) {
            throw new IllegalArgumentException("A shift for this employee on this date already exists");
        }

        BusinessShift shift = new BusinessShift(business, targetUser, request.date(), startTime, endTime);
        BusinessShift saved = businessShiftRepository.save(shift);

        return toShiftResponse(saved, membership);
    }

    @Transactional
    public void deleteShift(User actor, Long businessId, Long shiftId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found"));

        if (!isOwnerOrManager(actor, business)) {
            throw new IllegalArgumentException("Only the business owner or a manager can delete shifts");
        }

        BusinessShift shift = businessShiftRepository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));

        if (!shift.getBusiness().getId().equals(business.getId())) {
            throw new IllegalArgumentException("Shift does not belong to this business");
        }

        businessShiftRepository.delete(shift);
    }

    public List<BusinessShiftResponse> getShiftsForBusiness(User actor, Long businessId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Business not found"));

        if (!isBusinessMember(actor, business)) {
            throw new IllegalArgumentException("You do not have access to this business");
        }

        return businessShiftRepository.findByBusiness(business).stream()
                .map(shift -> {
                    BusinessMember membership = businessMemberRepository.findByBusinessAndUser(business, shift.getUser())
                            .orElse(null);
                    return toShiftResponse(shift, membership);
                })
                .toList();
    }

    public boolean isOwnerOrManager(User user, Business business) {
        if (business.getOwner().getId().equals(user.getId())) {
            return true;
        }

        return business.getMembers().stream()
                .anyMatch(member ->
                        member.getUser().getId().equals(user.getId())
                                && (member.getRole() == BusinessRole.MANAGER || member.getRole() == BusinessRole.OWNER));
    }

    public boolean isBusinessOwner(User user, Business business) {
        return business.getOwner().getId().equals(user.getId());
    }

    public boolean isBusinessMember(User user, Business business) {
        return business.getMembers().stream()
                .anyMatch(member -> member.getUser().getId().equals(user.getId()));
    }

    private BusinessResponse toBusinessResponse(Business business) {
        return new BusinessResponse(
                business.getId(),
                business.getName(),
                business.getOwner().getId(),
                business.getOwner().getName(),
                business.getAddress(),
                business.getPhone(),
                business.getDescription(),
                business.getEnabledPages().stream().sorted().toList()
        );
    }

    private BusinessMemberResponse toMemberResponse(BusinessMember member) {
        return new BusinessMemberResponse(
                member.getId(),
                member.getBusiness().getId(),
                member.getUser().getId(),
                member.getUser().getName(),
                member.getRole(),
                member.getTitle()
        );
    }

    private BusinessShiftResponse toShiftResponse(BusinessShift shift, BusinessMember membership) {
        return new BusinessShiftResponse(
                shift.getId(),
                shift.getBusiness().getId(),
                shift.getUser().getId(),
                shift.getUser().getName(),
                membership != null ? membership.getTitle() : null,
                membership != null ? membership.getRole().name() : null,
                shift.getDate(),
                shift.getStartTime(),
                shift.getEndTime()
        );
    }

    private String buildDisplayNameFromEmail(String email) {
        String localPart = email.substring(0, email.indexOf('@'));
        return localPart.substring(0, 1).toUpperCase() + localPart.substring(1);
    }
}
