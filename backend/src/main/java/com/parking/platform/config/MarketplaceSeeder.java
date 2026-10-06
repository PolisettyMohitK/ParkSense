package com.parking.platform.config;

import com.parking.platform.entity.Organization;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.PlaceCategory;
import com.parking.platform.entity.enums.VerificationStatus;
import com.parking.platform.entity.enums.ZoneType;
import com.parking.platform.repository.OrganizationRepository;
import com.parking.platform.repository.ParkingSiteRepository;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ParkingZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Adds a set of fictional venues around MG Road, Bengaluru so the driver
 * marketplace has content to browse. Idempotent: it skips when the first
 * marketplace organization already exists, and it only back-fills the demo
 * site when fields are missing.
 */
@Component
@Profile("dev")
@Order(2)
@RequiredArgsConstructor
public class MarketplaceSeeder implements ApplicationRunner {

    private static final String MARKER_CODE = "PLACE-BREW";

    private final OrganizationRepository organizationRepository;
    private final ParkingSiteRepository siteRepository;
    private final ParkingZoneRepository zoneRepository;
    private final ParkingSpaceRepository spaceRepository;
    private final Random random = new Random(42);

    private record PlaceSpec(
            String slug,
            String name,
            PlaceCategory category,
            String address,
            double latitude,
            double longitude,
            int ratePerHour,
            String openingHours,
            String amenities,
            String cover,
            int zones,
            int spacesPerZone,
            double occupancy
    ) {
    }

    private static final List<PlaceSpec> PLACES = List.of(
            new PlaceSpec("brew", "Brew & Bloom Café", PlaceCategory.CAFE, "Church Street", 12.9750, 77.6030,
                    30, "8:00 AM – 11:00 PM", "EV_CHARGING,CCTV,COVERED", "/places/cafe-1.jpg", 1, 12, 0.55),
            new PlaceSpec("copper", "Copper Kettle Café", PlaceCategory.CAFE, "Lavelle Road", 12.9718, 77.5985,
                    25, "7:30 AM – 10:30 PM", "CCTV,COVERED", "/places/cafe-2.jpg", 1, 10, 0.45),
            new PlaceSpec("grind", "The Daily Grind", PlaceCategory.CAFE, "Indiranagar 100ft Road", 12.9784, 77.6408,
                    30, "8:00 AM – 12:00 AM", "EV_CHARGING,CCTV,VALET", "/places/cafe-3.jpg", 2, 10, 0.60),
            new PlaceSpec("saffron", "Saffron Table", PlaceCategory.RESTAURANT, "St. Marks Road", 12.9710, 77.5950,
                    40, "12:00 PM – 11:30 PM", "VALET,COVERED,CCTV", "/places/restaurant.jpg", 1, 16, 0.70),
            new PlaceSpec("skyline", "Skyline Mall", PlaceCategory.MALL, "Residency Road", 12.9698, 77.6000,
                    60, "10:00 AM – 11:00 PM", "EV_CHARGING,COVERED,CCTV,VALET", "/places/mall.jpg", 2, 24, 0.65),
            new PlaceSpec("orchid", "Orchid Grand Hotel", PlaceCategory.HOTEL, "Richmond Road", 12.9650, 77.5980,
                    80, "Open 24 hours", "VALET,COVERED,CCTV", "/places/hotel.jpg", 1, 18, 0.50),
            new PlaceSpec("nexus", "Nexus Tech Park", PlaceCategory.OFFICE, "Old Airport Road", 12.9600, 77.6480,
                    50, "7:00 AM – 10:00 PM", "EV_CHARGING,COVERED,CCTV", "/places/office.jpg", 2, 30, 0.75),
            new PlaceSpec("citycare", "CityCare Hospital", PlaceCategory.HOSPITAL, "Infantry Road", 12.9830, 77.5990,
                    20, "Open 24 hours", "CCTV,COVERED", "/places/hospital.jpg", 1, 20, 0.80)
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (organizationRepository.existsByCode(MARKER_CODE)) {
            backfillDemoSite();
            return;
        }
        for (PlaceSpec spec : PLACES) {
            seedPlace(spec);
        }
        backfillDemoSite();
    }

    private void seedPlace(PlaceSpec spec) {
        Organization organization = organizationRepository.save(Organization.builder()
                .name(spec.name() + " Management")
                .code("PLACE-" + spec.slug().toUpperCase())
                .contactEmail("hello@" + spec.slug() + ".example")
                .contactPhone("+91-80-4000-0000")
                .address(spec.address() + ", " + "Bengaluru")
                .active(true)
                .build());

        ParkingSite site = siteRepository.save(ParkingSite.builder()
                .organization(organization)
                .name(spec.name())
                .code("VENUE-" + spec.slug().toUpperCase())
                .address(spec.address())
                .city("Bengaluru")
                .latitude(spec.latitude())
                .longitude(spec.longitude())
                .category(spec.category())
                .description(spec.category().name().charAt(0)
                        + spec.category().name().substring(1).toLowerCase()
                        + " parking with live availability.")
                .coverImageUrl(spec.cover())
                .hourlyRate(BigDecimal.valueOf(spec.ratePerHour()))
                .openingHours(spec.openingHours())
                .amenities(spec.amenities())
                .active(true)
                .build());

        for (int zoneIndex = 1; zoneIndex <= spec.zones(); zoneIndex++) {
            ParkingZone zone = zoneRepository.save(ParkingZone.builder()
                    .site(site)
                    .name(spec.zones() == 1 ? "Parking" : "Parking " + zoneIndex)
                    .code("P" + zoneIndex)
                    .type(zoneIndex == 1 ? ZoneType.STRUCTURED : ZoneType.UNSTRUCTURED)
                    .floor(zoneIndex == 1 ? "Ground" : null)
                    .capacity(spec.spacesPerZone())
                    .active(true)
                    .build());

            List<ParkingSpace> spaces = new ArrayList<>();
            int columns = 4;
            for (int index = 1; index <= spec.spacesPerZone(); index++) {
                boolean occupied = random.nextDouble() < spec.occupancy();
                ParkingSpace space = spaceRepository.save(ParkingSpace.builder()
                        .zone(zone)
                        .code(String.format("%s%02d", (char) ('A' + zoneIndex - 1), index))
                        .occupancyState(occupied ? OccupancyState.OCCUPIED : OccupancyState.VACANT)
                        .operationalState(OperationalState.IN_SERVICE)
                        .verificationStatus(VerificationStatus.VERIFIED)
                        .positionX(40.0 + ((index - 1) % columns) * 92.0)
                        .positionY(60.0 + ((index - 1) / columns) * 112.0)
                        .active(true)
                        .build());
                spaces.add(space);
            }
        }
        org.slf4j.LoggerFactory.getLogger(MarketplaceSeeder.class)
                .info("Seeded place {} ({}) with {} zone(s)", spec.name(), spec.category(), spec.zones());
    }

    private void backfillDemoSite() {
        siteRepository.findByOrganizationIdAndCode(
                        organizationRepository.findByCode("DEMO").map(Organization::getId).orElse(-1L), "SITE-1")
                .ifPresent(site -> {
                    boolean changed = false;
                    if (site.getCategory() == null) {
                        site.setCategory(PlaceCategory.OFFICE);
                        changed = true;
                    }
                    if (site.getCoverImageUrl() == null) {
                        site.setCoverImageUrl("/places/campus.jpg");
                        changed = true;
                    }
                    if (site.getHourlyRate() == null) {
                        site.setHourlyRate(BigDecimal.valueOf(50));
                        changed = true;
                    }
                    if (site.getOpeningHours() == null) {
                        site.setOpeningHours("Open 24 hours");
                        changed = true;
                    }
                    if (site.getAmenities() == null) {
                        site.setAmenities("EV_CHARGING,COVERED,CCTV");
                        changed = true;
                    }
                    if (site.getDescription() == null) {
                        site.setDescription("Central campus office parking with live availability.");
                        changed = true;
                    }
                    if (changed) {
                        siteRepository.save(site);
                    }
                });
    }
}
