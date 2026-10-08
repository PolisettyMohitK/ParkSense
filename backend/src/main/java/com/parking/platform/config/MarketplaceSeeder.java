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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
 * Seeds accurate, realistic parking places across Hyderabad (Jubilee Hills,
 * Banjara Hills, Hitec City, Madhapur, Gachibowli, Kondapur).
 * Accurately models free/customer-managed parking (cafes, restaurants, hotels)
 * vs. commercial paid parking (malls, IT tech parks, hospitals).
 */
@Component
@Profile("dev")
@Order(2)
@RequiredArgsConstructor
public class MarketplaceSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MarketplaceSeeder.class);
    private static final String MARKER_CODE = "PLACE-ROASTERY-V2";

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
            Integer ratePerHour, // null = free / customer-managed
            String openingHours,
            String amenities,
            String cover,
            int zones,
            int spacesPerZone,
            double occupancy,
            String description
    ) {
    }

    private static final List<PlaceSpec> PLACES = List.of(
            new PlaceSpec(
                    "roastery",
                    "Roastery Coffee House",
                    PlaceCategory.CAFE,
                    "Road No. 45, Jubilee Hills",
                    17.4325,
                    78.4072,
                    null, // Customer managed / free for patrons
                    "8:00 AM – 11:00 PM",
                    "VALET,COVERED,CCTV",
                    "/places/cafe-1.jpg",
                    1,
                    14,
                    0.50,
                    "Specialty coffee house with complimentary customer parking and valet service."
            ),
            new PlaceSpec(
                    "roastccx",
                    "Roast CCX",
                    PlaceCategory.CAFE,
                    "Road No. 36, Jubilee Hills",
                    17.4300,
                    78.4050,
                    null, // Free customer parking
                    "7:30 AM – 11:30 PM",
                    "EV_CHARGING,CCTV,COVERED",
                    "/places/cafe-2.jpg",
                    1,
                    12,
                    0.40,
                    "Artisan roastery with dedicated customer parking and dual EV chargers."
            ),
            new PlaceSpec(
                    "concu",
                    "Conçū Bakery & Pâtisserie",
                    PlaceCategory.CAFE,
                    "Road No. 21, Jubilee Hills",
                    17.4385,
                    78.4110,
                    null, // Free patron parking
                    "10:00 AM – 11:00 PM",
                    "VALET,CCTV",
                    "/places/cafe-3.jpg",
                    1,
                    10,
                    0.60,
                    "Premium patisserie & dessert lounge with complimentary guest valet parking."
            ),
            new PlaceSpec(
                    "tatva",
                    "Tatva Fine Dining",
                    PlaceCategory.RESTAURANT,
                    "Road No. 36, Jubilee Hills",
                    17.4312,
                    78.4065,
                    null, // Complimentary for diners
                    "12:00 PM – 11:30 PM",
                    "VALET,COVERED,CCTV",
                    "/places/restaurant.jpg",
                    1,
                    16,
                    0.65,
                    "Fine vegetarian dining with dedicated customer parking and complimentary valet."
            ),
            new PlaceSpec(
                    "inorbit",
                    "Inorbit Mall Cyberabad",
                    PlaceCategory.MALL,
                    "Mindspace, Madhapur",
                    17.4340,
                    78.3860,
                    40, // Commercial paid parking: ₹40/hr
                    "10:00 AM – 11:00 PM",
                    "EV_CHARGING,COVERED,CCTV,VALET",
                    "/places/mall.jpg",
                    2,
                    24,
                    0.70,
                    "Multi-level structured parking facility with fast DC fast chargers, CCTV, and smart bays."
            ),
            new PlaceSpec(
                    "sarath",
                    "Sarath City Capital Mall",
                    PlaceCategory.MALL,
                    "Gachibowli - Miyapur Rd, Kondapur",
                    17.4580,
                    78.3620,
                    50, // Commercial paid: ₹50/hr
                    "10:00 AM – 11:00 PM",
                    "EV_CHARGING,COVERED,CCTV,VALET",
                    "/places/mall.jpg",
                    3,
                    20,
                    0.65,
                    "Largest retail mall in Telangana with 4-tier basement parking and automated bay guidance."
            ),
            new PlaceSpec(
                    "cyber",
                    "Cyber Towers Tech Park",
                    PlaceCategory.OFFICE,
                    "Hitec City, Madhapur",
                    17.4504,
                    78.3808,
                    30, // Commercial paid: ₹30/hr
                    "7:00 AM – 11:00 PM",
                    "EV_CHARGING,COVERED,CCTV",
                    "/places/office.jpg",
                    2,
                    28,
                    0.80,
                    "Flagship IT hub with automated barrier gates, visitor parking, and 24/7 security."
            ),
            new PlaceSpec(
                    "aig",
                    "AIG Hospitals",
                    PlaceCategory.HOSPITAL,
                    "Mindspace Road, Gachibowli",
                    17.4420,
                    78.3580,
                    20, // Hospital paid: ₹20/hr
                    "Open 24 hours",
                    "CCTV,COVERED",
                    "/places/hospital.jpg",
                    2,
                    20,
                    0.85,
                    "Super-speciality medical campus with 24/7 priority emergency drop-off & multi-level parking."
            ),
            new PlaceSpec(
                    "itc",
                    "ITC Kohenur",
                    PlaceCategory.HOTEL,
                    "Knowledge City, HITEC City",
                    17.4370,
                    78.3820,
                    null, // Free / complimentary valet for hotel patrons
                    "Open 24 hours",
                    "VALET,COVERED,CCTV,EV_CHARGING",
                    "/places/hotel.jpg",
                    1,
                    18,
                    0.45,
                    "Luxury five-star hotel with complimentary guest valet and covered basement suites."
            )
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (organizationRepository.existsByCode(MARKER_CODE)) {
            backfillDemoSite();
            return;
        }

        purgeLegacyPlaces();

        for (PlaceSpec spec : PLACES) {
            seedPlace(spec);
        }
        backfillDemoSite();
    }

    private void purgeLegacyPlaces() {
        log.info("Purging legacy demo places to migrate to Hyderabad accurate dataset...");
        // Purge previous Bengaluru demo orgs
        List<String> legacyCodes = List.of(
                "PLACE-BREW", "PLACE-COPPER", "PLACE-GRIND", "PLACE-SAFFRON",
                "PLACE-SKYLINE", "PLACE-ORCHID", "PLACE-NEXUS", "PLACE-CITYCARE"
        );
        for (String code : legacyCodes) {
            organizationRepository.findByCode(code).ifPresent(org -> {
                siteRepository.findAllByOrganizationId(org.getId()).forEach(site -> {
                    zoneRepository.findAllBySiteId(site.getId()).forEach(zone -> {
                        spaceRepository.deleteAll(spaceRepository.findAllByZoneId(zone.getId()));
                        zoneRepository.delete(zone);
                    });
                    siteRepository.delete(site);
                });
                organizationRepository.delete(org);
            });
        }
    }

    private void seedPlace(PlaceSpec spec) {
        String orgCode = "PLACE-" + spec.slug().toUpperCase();
        if (organizationRepository.existsByCode(orgCode)) {
            return;
        }

        Organization organization = organizationRepository.save(Organization.builder()
                .name(spec.name() + " Management")
                .code(orgCode)
                .contactEmail("parking@" + spec.slug() + ".hyd.dev")
                .contactPhone("+91-40-4000-0000")
                .address(spec.address() + ", Hyderabad")
                .active(true)
                .build());

        ParkingSite site = siteRepository.save(ParkingSite.builder()
                .organization(organization)
                .name(spec.name())
                .code("VENUE-" + spec.slug().toUpperCase())
                .address(spec.address())
                .city("Hyderabad")
                .latitude(spec.latitude())
                .longitude(spec.longitude())
                .category(spec.category())
                .description(spec.description())
                .coverImageUrl(spec.cover())
                .hourlyRate(spec.ratePerHour() != null ? BigDecimal.valueOf(spec.ratePerHour()) : null)
                .openingHours(spec.openingHours())
                .amenities(spec.amenities())
                .active(true)
                .build());

        for (int zoneIndex = 1; zoneIndex <= spec.zones(); zoneIndex++) {
            String zoneName = spec.zones() == 1 ? "Main Lot" : "Level " + zoneIndex;
            ParkingZone zone = zoneRepository.save(ParkingZone.builder()
                    .site(site)
                    .name(zoneName)
                    .code("P" + zoneIndex)
                    .type(zoneIndex == 1 ? ZoneType.STRUCTURED : ZoneType.UNSTRUCTURED)
                    .floor(zoneIndex == 1 ? "Ground" : "Level " + zoneIndex)
                    .capacity(spec.spacesPerZone())
                    .active(true)
                    .build());

            List<ParkingSpace> spaces = new ArrayList<>();
            int columns = 4;
            for (int index = 1; index <= spec.spacesPerZone(); index++) {
                boolean occupied = random.nextDouble() < spec.occupancy();
                double posX = 40.0 + ((index - 1) % columns) * 92.0;
                double posY = 60.0 + ((index - 1) / columns) * 112.0;
                int px = (int) posX;
                int py = (int) posY;

                ParkingSpace space = spaceRepository.save(ParkingSpace.builder()
                        .zone(zone)
                        .code(String.format("%s%02d", (char) ('A' + zoneIndex - 1), index))
                        .occupancyState(occupied ? OccupancyState.OCCUPIED : OccupancyState.VACANT)
                        .operationalState(OperationalState.IN_SERVICE)
                        .verificationStatus(VerificationStatus.VERIFIED)
                        .positionX(posX)
                        .positionY(posY)
                        .polygon(String.format("[%d,%d %d,%d %d,%d %d,%d]",
                                px, py, px + 70, py, px + 70, py + 100, px, py + 100))
                        .active(true)
                        .build());
                spaces.add(space);
            }
        }

        log.info("Seeded Hyderabad venue {} ({}) with {} zone(s) - Rate: {}",
                spec.name(), spec.category(), spec.zones(),
                spec.ratePerHour() != null ? ("₹" + spec.ratePerHour() + "/hr") : "Free / Customer Managed");
    }

    private void backfillDemoSite() {
        organizationRepository.findByCode("DEMO").ifPresent(org -> {
            org.setAddress("Road No. 1, Banjara Hills, Hyderabad");
            organizationRepository.save(org);

            siteRepository.findByOrganizationIdAndCode(org.getId(), "SITE-1")
                    .ifPresent(site -> {
                        site.setName("Banjara Hills Campus");
                        site.setAddress("Road No. 1, Banjara Hills");
                        site.setCity("Hyderabad");
                        site.setLatitude(17.4156);
                        site.setLongitude(78.4353);
                        site.setCategory(PlaceCategory.OFFICE);
                        site.setCoverImageUrl("/places/campus.jpg");
                        site.setHourlyRate(null); // Org managed / complimentary
                        site.setOpeningHours("Open 24 hours");
                        site.setAmenities("EV_CHARGING,COVERED,CCTV");
                        site.setDescription("Central Banjara Hills corporate office campus with complimentary employee & visitor parking.");
                        siteRepository.save(site);
                    });
        });
    }
}
