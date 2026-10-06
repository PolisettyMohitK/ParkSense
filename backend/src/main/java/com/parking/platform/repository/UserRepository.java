package com.parking.platform.repository;

import com.parking.platform.entity.User;
import com.parking.platform.entity.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findAllByOrganizationId(Long organizationId);

    List<User> findAllByRole(Role role);
}
