package com.parking.platform.support;

import com.parking.platform.entity.Organization;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.User;
import com.parking.platform.entity.Vehicle;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.PlaceCategory;
import com.parking.platform.entity.enums.Role;
import com.parking.platform.entity.enums.VerificationStatus;
import com.parking.platform.entity.enums.VehicleType;
import com.parking.platform.entity.enums.ZoneType;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;

/** Small factory helpers so tests read as scenario narratives. */
public final class Fixtures {

    private Fixtures() {
    }

    public static Organization organization(String code) {
        return Organization.builder()
                .name("Org " + code)
                .code(code)
                .contactEmail("hello@" + code.toLowerCase() + ".dev")
                .active(true)
                .build();
    }

    public static ParkingSite site(Organization organization, String code, double latitude, double longitude,
                                   PlaceCategory category, BigDecimal hourlyRate) {
        return ParkingSite.builder()
                .organization(organization)
                .name("Place " + code)
                .code(code)
                .address("1 Test Road")
                .city("Bengaluru")
                .latitude(latitude)
                .longitude(longitude)
                .category(category)
                .coverImageUrl("/places/test.jpg")
                .hourlyRate(hourlyRate)
                .openingHours("Open 24 hours")
                .amenities("CCTV,COVERED")
                .active(true)
                .build();
    }

    public static ParkingZone zone(ParkingSite site, String code) {
        return ParkingZone.builder()
                .site(site)
                .name("Zone " + code)
                .code(code)
                .type(ZoneType.STRUCTURED)
                .capacity(10)
                .active(true)
                .build();
    }

    public static ParkingSpace space(ParkingZone zone, String code) {
        return ParkingSpace.builder()
                .zone(zone)
                .code(code)
                .occupancyState(OccupancyState.VACANT)
                .operationalState(OperationalState.IN_SERVICE)
                .verificationStatus(VerificationStatus.VERIFIED)
                .positionX(10.0)
                .positionY(10.0)
                .active(true)
                .build();
    }

    public static User user(Organization organization, String email, Role role, PasswordEncoder encoder) {
        return User.builder()
                .fullName(email.split("@")[0])
                .email(email)
                .passwordHash(encoder.encode("secret123"))
                .role(role)
                .enabled(true)
                .organization(organization)
                .build();
    }

    public static Vehicle vehicle(User owner, String plate) {
        return Vehicle.builder()
                .owner(owner)
                .plateNumber(plate)
                .make("Toyota")
                .model("Corolla")
                .type(VehicleType.CAR)
                .active(true)
                .build();
    }
}
