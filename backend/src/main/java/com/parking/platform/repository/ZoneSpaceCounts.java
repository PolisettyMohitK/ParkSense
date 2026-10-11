package com.parking.platform.repository;

/** Projection for {@link ParkingSpaceRepository#countStatusByZone}. */
public interface ZoneSpaceCounts {

    Long getZoneId();

    Long getTotal();

    Long getOutOfService();

    Long getOccupied();

    Long getReserved();
}
