package com.parking.platform.mapper;

import com.parking.platform.dto.request.ParkingZoneRequest;
import com.parking.platform.dto.response.ParkingZoneResponse;
import com.parking.platform.entity.ParkingZone;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ParkingZoneMapper {

    @Mapping(source = "site.id", target = "siteId")
    @Mapping(source = "site.name", target = "siteName")
    ParkingZoneResponse toResponse(ParkingZone entity);

    ParkingZone toEntity(ParkingZoneRequest request);

    void updateEntity(ParkingZoneRequest request, @MappingTarget ParkingZone entity);
}
