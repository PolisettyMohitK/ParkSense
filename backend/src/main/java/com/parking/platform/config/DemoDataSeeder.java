package com.parking.platform.config;

import com.parking.platform.dto.request.OccupancyEventRequest;
import com.parking.platform.entity.MonitoringDevice;
import com.parking.platform.entity.Organization;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.Reservation;
import com.parking.platform.entity.User;
import com.parking.platform.entity.Vehicle;
import com.parking.platform.entity.enums.DeviceStatus;
import com.parking.platform.entity.enums.DeviceType;
import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.ReservationStatus;
import com.parking.platform.entity.enums.Role;
import com.parking.platform.entity.enums.VerificationStatus;
import com.parking.platform.entity.enums.VehicleType;
import com.parking.platform.entity.enums.ZoneType;
import com.parking.platform.repository.MonitoringDeviceRepository;
import com.parking.platform.repository.OrganizationRepository;
import com.parking.platform.repository.ParkingSiteRepository;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ParkingZoneRepository;
import com.parking.platform.repository.ReservationRepository;
import com.parking.platform.repository.UserRepository;
import com.parking.platform.repository.VehicleRepository;
import com.parking.platform.service.OccupancyService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Component
@Profile("dev")
@Order(1)
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final ParkingSiteRepository siteRepository;
    private final ParkingZoneRepository zoneRepository;
    private final ParkingSpaceRepository spaceRepository;
    private final MonitoringDeviceRepository deviceRepository;
    private final VehicleRepository vehicleRepository;
    private final ReservationRepository reservationRepository;
    private final OccupancyService occupancyService;
    private final PasswordEncoder passwordEncoder;
    private final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DemoDataSeeder.class);

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (organizationRepository.count() > 0) {
            log.info("Demo data already present - skipping seed");
            return;
        }

        Organization organization = organizationRepository.save(Organization.builder()
                .name("Demo Parking Organization")
                .code("DEMO")
                .contactEmail("contact@demo-parking.dev")
                .contactPhone("+91-9000000000")
                .address("MG Road, Bengaluru")
                .active(true)
                .build());

        User admin = userRepository.save(User.builder()
                .fullName("Admin User").email("admin@parking.dev")
                .passwordHash(passwordEncoder.encode("admin123"))
                .role(Role.ADMIN).phone("+91-9000000001").enabled(true).organization(organization).build());
        User manager = userRepository.save(User.builder()
                .fullName("Maya Manager").email("manager@parking.dev")
                .passwordHash(passwordEncoder.encode("manager123"))
                .role(Role.MANAGER).phone("+91-9000000002").enabled(true).organization(organization).build());
        User driver = userRepository.save(User.builder()
                .fullName("Ravi Driver").email("user@parking.dev")
                .passwordHash(passwordEncoder.encode("user123"))
                .role(Role.USER).phone("+91-9000000003").enabled(true).organization(organization).build());

        ParkingSite site = siteRepository.save(ParkingSite.builder()
                .organization(organization)
                .name("Central Campus")
                .code("SITE-1")
                .address("100 MG Road")
                .city("Bengaluru")
                .latitude(12.9756)
                .longitude(77.6053)
                .active(true)
                .build());

        ParkingZone level1 = zoneRepository.save(ParkingZone.builder()
                .site(site).name("Level 1").code("L1").type(ZoneType.STRUCTURED)
                .floor("1").capacity(12).description("Basement level 1 structured parking").active(true)
                .build());
        ParkingZone yard = zoneRepository.save(ParkingZone.builder()
                .site(site).name("Open Yard").code("YARD").type(ZoneType.UNSTRUCTURED)
                .capacity(8).description("Unstructured open area mapped from a photo").active(true)
                .build());

        List<ParkingSpace> level1Spaces = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            level1Spaces.add(spaceRepository.save(ParkingSpace.builder()
                    .zone(level1)
                    .code(String.format("A%02d", i))
                    .verificationStatus(VerificationStatus.VERIFIED)
                    .positionX(60 + (i - 1) % 4 * 90.0)
                    .positionY(80 + (i - 1) / 4 * 110.0)
                    .active(true)
                    .build()));
        }

        for (int i = 1; i <= 4; i++) {
            spaceRepository.save(ParkingSpace.builder()
                    .zone(yard)
                    .verificationStatus(VerificationStatus.PROPOSED)
                    .positionX(70 + i * 95.0)
                    .positionY(120.0)
                    .polygon(String.format("[%d,%d %d,%d %d,%d %d,%d]",
                            (int) (40 + i * 95), 80, (int) (125 + i * 95), 80,
                            (int) (125 + i * 95), 180, (int) (40 + i * 95), 180))
                    .active(true)
                    .build());
        }

        MonitoringDevice camera = deviceRepository.save(MonitoringDevice.builder()
                .zone(level1).name("Level 1 Camera").code("CAM-L1")
                .type(DeviceType.CAMERA).status(DeviceStatus.ONLINE)
                .identifier("cam-l1-01").streamUrl("rtsp://demo/level1").lastSeenAt(Instant.now())
                .active(true)
                .build());

        Vehicle car = vehicleRepository.save(Vehicle.builder()
                .owner(driver).plateNumber("KA01AB1234").make("Toyota").model("Corolla")
                .color("White").type(VehicleType.CAR).active(true).build());

        Instant now = Instant.now();

        ParkingSpace reservedSpace = level1Spaces.get(0);
        reservedSpace.setReserved(true);
        spaceRepository.save(reservedSpace);
        reservationRepository.save(Reservation.builder()
                .code("RES-DEMO0001").user(driver).vehicle(car).zone(level1)
                .assignedSpace(reservedSpace).status(ReservationStatus.CONFIRMED)
                .startTime(now.plus(1, ChronoUnit.HOURS))
                .endTime(now.plus(3, ChronoUnit.HOURS))
                .build());

        occupancyService.recordEvent(new OccupancyEventRequest(
                level1Spaces.get(2).getId(), OccupancyState.VACANT, EventSource.MANUAL,
                null, admin.getId(), null, null, "Seeded: space was empty",
                now.minus(90, ChronoUnit.MINUTES)));
        occupancyService.recordEvent(new OccupancyEventRequest(
                level1Spaces.get(2).getId(), OccupancyState.OCCUPIED, EventSource.MANUAL,
                null, manager.getId(), null, null, "Seeded: manual check-in",
                now.minus(30, ChronoUnit.MINUTES)));

        occupancyService.recordEvent(new OccupancyEventRequest(
                level1Spaces.get(4).getId(), OccupancyState.OCCUPIED, EventSource.CAMERA,
                0.94, null, camera.getId(), null, "Seeded: camera detection",
                now.minus(3, ChronoUnit.HOURS)));
        occupancyService.recordEvent(new OccupancyEventRequest(
                level1Spaces.get(4).getId(), OccupancyState.VACANT, EventSource.CAMERA,
                0.90, null, camera.getId(), null, "Seeded: camera cleared",
                now.minus(1, ChronoUnit.HOURS)));

        occupancyService.recordEvent(new OccupancyEventRequest(
                level1Spaces.get(6).getId(), OccupancyState.OCCUPIED, EventSource.CAMERA,
                0.92, null, camera.getId(), null, "Seeded: camera detection",
                now.minus(20, ChronoUnit.MINUTES)));

        log.info("Seeded demo data: org={}, site=SITE-1, zones=L1/YARD, spaces=16, devices=1",
                organization.getCode());
        log.info("Seeded 3 occupancy events per flow; 2 active sessions, 1 completed session");
        log.info("Demo logins -> admin@parking.dev/admin123, manager@parking.dev/manager123, user@parking.dev/user123");
    }
}
