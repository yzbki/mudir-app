package com.youzbaki.mudir.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Case-insensitive so an address always resolves to the same account, even for rows
     * stored before emails were normalized.
     */
    Optional<User> findByEmailIgnoreCase(String email);
}
