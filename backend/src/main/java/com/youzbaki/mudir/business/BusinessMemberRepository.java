package com.youzbaki.mudir.business;

import com.youzbaki.mudir.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BusinessMemberRepository extends JpaRepository<BusinessMember, Long> {

    Optional<BusinessMember> findByBusinessAndUser(Business business, User user);

    boolean existsByBusinessAndUser(Business business, User user);
}
