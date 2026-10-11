package com.parking.platform.mapper;

import com.parking.platform.dto.request.ReservationRequest;
import com.parking.platform.dto.response.ReservationResponse;
import com.parking.platform.entity.Reservation;
import org.mapstruct.Mapper;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ReservationMapper {

    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.fullName", target = "userName")
    @Mapping(source = "vehicle.id", target = "vehicleId")
    @Mapping(source = "vehicle.plateNumber", target = "plateNumber")
    @Mapping(source = "zone.id", target = "zoneId")
    @Mapping(source = "zone.name", target = "zoneName")
    @Mapping(source = "assignedSpace.id", target = "assignedSpaceId")
    @Mapping(source = "assignedSpace.code", target = "assignedSpaceCode")
    @Mapping(source = "zone.site.id", target = "siteId")
    @Mapping(source = "zone.site.name", target = "siteName")
    ReservationResponse toResponse(Reservation entity);

    Reservation toEntity(ReservationRequest request);

    void updateEntity(ReservationRequest request, @MappingTarget Reservation entity);
}
