package com.parking.platform.mapper;

import com.parking.platform.dto.response.ParkingSessionResponse;
import com.parking.platform.entity.ParkingSession;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ParkingSessionMapper {

    @Mapping(source = "space.id", target = "spaceId")
    @Mapping(source = "space.code", target = "spaceCode")
    @Mapping(source = "space.zone.id", target = "zoneId")
    @Mapping(source = "space.zone.name", target = "zoneName")
    @Mapping(source = "vehicle.id", target = "vehicleId")
    @Mapping(source = "vehicle.plateNumber", target = "plateNumber")
    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.fullName", target = "userName")
    @Mapping(source = "reservation.id", target = "reservationId")
    @Mapping(source = "reservation.code", target = "reservationCode")
    ParkingSessionResponse toResponse(ParkingSession entity);
}
