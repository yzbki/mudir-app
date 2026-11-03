package com.youzbaki.mudir.business;

import com.youzbaki.mudir.business.dto.BusinessCreateRequest;
import com.youzbaki.mudir.business.dto.BusinessMemberRequest;
import com.youzbaki.mudir.business.dto.BusinessMemberResponse;
import com.youzbaki.mudir.business.dto.BusinessResponse;
import com.youzbaki.mudir.user.User;
import com.youzbaki.mudir.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class BusinessService {

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

        BusinessMember existing = businessMemberRepository.findByBusinessAndUser(business, targetUser)
                .orElseGet(() -> new BusinessMember(business, targetUser, request.role()));

        existing.setRole(request.role());
        BusinessMember saved = businessMemberRepository.save(existing);

        return new BusinessMemberResponse(
                saved.getId(),
                business.getId(),
                targetUser.getId(),
                targetUser.getName(),
                saved.getRole()
        );
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

    private BusinessResponse toBusinessResponse(Business business) {
        return new BusinessResponse(
                business.getId(),
                business.getName(),
                business.getOwner().getId(),
                business.getOwner().getName()
        );
    }
}
