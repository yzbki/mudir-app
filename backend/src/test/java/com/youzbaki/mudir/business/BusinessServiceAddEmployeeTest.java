package com.youzbaki.mudir.business;

import com.youzbaki.mudir.business.dto.BusinessMemberRequest;
import com.youzbaki.mudir.user.User;
import com.youzbaki.mudir.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BusinessServiceAddEmployeeTest {

    private static final long BUSINESS_ID = 10L;

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private BusinessService businessService;
    private User owner;

    @BeforeEach
    void setUp() {
        BusinessRepository businessRepository = mock(BusinessRepository.class);
        BusinessMemberRepository memberRepository = mock(BusinessMemberRepository.class);
        userRepository = mock(UserRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        businessService = new BusinessService(
                businessRepository, memberRepository, mock(BusinessShiftRepository.class), userRepository, passwordEncoder);

        owner = withId(new User("owner@example.com", "hash", "Owner"), 1L);
        Business business = new Business("Corner Cafe", owner);
        ReflectionTestUtils.setField(business, "id", BUSINESS_ID);

        when(businessRepository.findById(BUSINESS_ID)).thenReturn(Optional.of(business));
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> withId(invocation.getArgument(0), 99L));
        when(memberRepository.findByBusinessAndUser(any(), any())).thenReturn(Optional.empty());
        when(memberRepository.save(any(BusinessMember.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void newEmployeeAccountGetsTheGivenPasswordHashed() {
        businessService.assignEmployee(owner, BUSINESS_ID, request("  Lina@Example.com ", "password123"));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(saved.capture());
        assertEquals("lina@example.com", saved.getValue().getEmail());
        assertTrue(passwordEncoder.matches("password123", saved.getValue().getPassword()),
                "employee must be able to log in with the password the manager set");
    }

    @Test
    void newEmployeeAccountRequiresValidPassword() {
        assertThrows(IllegalArgumentException.class,
                () -> businessService.assignEmployee(owner, BUSINESS_ID, request("lina@example.com", null)));
        assertThrows(IllegalArgumentException.class,
                () -> businessService.assignEmployee(owner, BUSINESS_ID, request("lina@example.com", "short")));
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void existingAccountIsLinkedWithoutTouchingItsPassword() {
        User existing = withId(new User("sara@example.com", "original-hash", "Sara"), 5L);
        when(userRepository.findByEmailIgnoreCase("sara@example.com")).thenReturn(Optional.of(existing));

        businessService.assignEmployee(owner, BUSINESS_ID, request("SARA@example.com", "attacker-chosen-password"));

        assertEquals("original-hash", existing.getPassword());
        verify(userRepository, never()).saveAndFlush(any());
    }

    private static BusinessMemberRequest request(String email, String password) {
        return new BusinessMemberRequest(null, BusinessRole.EMPLOYEE, email, "Employee", "Cashier", password);
    }

    private static User withId(User user, long id) {
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
