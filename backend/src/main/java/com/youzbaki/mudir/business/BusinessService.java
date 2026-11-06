package com.youzbaki.mudir.business;

import com.youzbaki.mudir.business.dto.BusinessCreateRequest;
import com.youzbaki.mudir.business.dto.BusinessDetailsRequest;
import com.youzbaki.mudir.business.dto.BusinessMemberRequest;
import com.youzbaki.mudir.business.dto.BusinessMemberResponse;
import com.youzbaki.mudir.business.dto.BusinessResponse;
import com.youzbaki.mudir.user.User;
import com.youzbaki.mudir.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youzbaki.mudir.business.dto.BusinessSettingsRequest;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class BusinessService {

    private static final Set<String> REQUIRED_PAGE_KEYS = Set.of("dashboard", "employees", "profile");
    private static final Set<String> OPTIONAL_PAGE_KEYS = Set.of("schedule", "inventory", "tasks", "customers");

    private final BusinessRepository businessRepository;
    private final BusinessMemberRepository businessMemberRepository;
    private final UserRepository userRepository;

    public BusinessService(
            BusinessRepository businessRepository,
            BusinessMemberRepository businessMemberRepository,
            UserRepository userRepository) {
        this.businessRepository = businessRepository;
        this.businessMemberRepository = businessMemberRepository;
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

        User targetUser = userRepository.findById(request.userId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!isOwnerOrManager(actor, business)) {
            throw new IllegalArgumentException("Only the business owner or a manager can assign employees");
        }

        if (request.role() == null) {
            throw new IllegalArgumentException("Role is required");
        }

        if (request.role() == BusinessRole.OWNER) {
            throw new IllegalArgumentException("Cannot assign OWNER role to another user");
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
                member.getRole()
        );
    }
}
