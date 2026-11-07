package com.youzbaki.mudir.business;

import com.youzbaki.mudir.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface BusinessShiftRepository extends JpaRepository<BusinessShift, Long> {
    List<BusinessShift> findByBusiness(Business business);
    List<BusinessShift> findByBusinessAndDateBetween(Business business, LocalDate start, LocalDate end);
    boolean existsByBusinessAndUserAndDate(Business business, User user, LocalDate date);
    boolean existsByBusinessAndUserAndDateAndIdNot(Business business, User user, LocalDate date, Long id);
}
