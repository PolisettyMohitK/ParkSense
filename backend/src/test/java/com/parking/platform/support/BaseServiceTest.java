package com.parking.platform.support;

import com.parking.platform.entity.User;
import com.parking.platform.repository.OccupancyEventRepository;
import com.parking.platform.repository.OrganizationRepository;
import com.parking.platform.repository.ParkingSessionRepository;
import com.parking.platform.repository.ParkingSiteRepository;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ParkingZoneRepository;
import com.parking.platform.repository.ReservationRepository;
import com.parking.platform.repository.UserRepository;
import com.parking.platform.repository.VehicleRepository;
import com.parking.platform.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public abstract class BaseServiceTest {

    @Autowired protected OrganizationRepository organizations;
    @Autowired protected ParkingSiteRepository sites;
    @Autowired protected ParkingZoneRepository zones;
    @Autowired protected ParkingSpaceRepository spaces;
    @Autowired protected UserRepository users;
    @Autowired protected VehicleRepository vehicles;
    @Autowired protected ReservationRepository reservations;
    @Autowired protected ParkingSessionRepository sessions;
    @Autowired protected OccupancyEventRepository events;
    @Autowired protected PasswordEncoder encoder;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /** Run the next service call as the given user (drives role + ownership rules). */
    protected void asUser(User user) {
        UserPrincipal principal = new UserPrincipal(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
