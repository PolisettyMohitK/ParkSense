package com.parking.platform.service;

import com.parking.platform.entity.Organization;
import com.parking.platform.entity.enums.PlaceCategory;
import com.parking.platform.support.BaseServiceTest;
import com.parking.platform.support.Fixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Marketplace discovery: proximity ordering and filtering. */
class PlaceSearchTest extends BaseServiceTest {

    @Autowired private PlaceService placeService;

    // MG Road, Bengaluru — the reference point used by the apps.
    private static final double LAT = 12.9756;
    private static final double LNG = 77.6053;

    @BeforeEach
    void setUp() {
        Organization organization = organizations.save(Fixtures.organization("MKT"));
        sites.save(Fixtures.site(organization, "CAFE-1", 12.9750, 77.6030, PlaceCategory.CAFE,
                BigDecimal.valueOf(30)));
        sites.save(Fixtures.site(organization, "MALL-1", 12.9698, 77.6000, PlaceCategory.MALL,
                BigDecimal.valueOf(60)));
        sites.save(Fixtures.site(organization, "OFFICE-1", 12.9600, 77.6480, PlaceCategory.OFFICE,
                BigDecimal.valueOf(50)));
    }

    @Test
    void sortsByDistanceFromTheCaller() {
        var places = placeService.search(LAT, LNG, null, null, 50);

        assertThat(places).hasSize(3);
        assertThat(places.get(0).name()).contains("CAFE-1");
        assertThat(places.get(0).distanceKm()).isLessThan(places.get(1).distanceKm());
        assertThat(places.get(1).distanceKm()).isLessThan(places.get(2).distanceKm());
    }

    @Test
    void freeTextMatchesNameAddressAndCategory() {
        assertThat(placeService.search(LAT, LNG, "mall", null, 50))
                .extracting(p -> p.name())
                .containsExactly("Place MALL-1");
        assertThat(placeService.search(LAT, LNG, "1 test road", null, 50))
                .hasSize(3);
    }

    @Test
    void categoryFilterIsApplied() {
        List<String> names = placeService.search(LAT, LNG, null, PlaceCategory.CAFE, 50)
                .stream().map(p -> p.name()).toList();

        assertThat(names).containsExactly("Place CAFE-1");
    }

    @Test
    void withoutALocationResultsFallBackToNameOrder() {
        var places = placeService.search(null, null, null, null, 50);

        assertThat(places).hasSize(3);
        assertThat(places).allSatisfy(place -> assertThat(place.distanceKm()).isNull());
        assertThat(places.get(0).name()).isEqualTo("Place CAFE-1");
    }

    @Test
    void limitIsRespectedAndCapped() {
        assertThat(placeService.search(LAT, LNG, null, null, 2)).hasSize(2);
        assertThat(placeService.search(LAT, LNG, null, null, 5000).size()).isLessThanOrEqualTo(100);
    }
}
