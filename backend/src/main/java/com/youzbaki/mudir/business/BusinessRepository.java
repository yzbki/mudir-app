package com.youzbaki.mudir.business;

import com.youzbaki.mudir.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BusinessRepository extends JpaRepository<Business, Long> {

    List<Business> findAllByOwner(User owner);

    List<Business> findAllByMembersUser(User user);
}