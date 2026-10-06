package com.parking.platform.mapper;

import com.parking.platform.dto.response.OccupancyEventResponse;
import com.parking.platform.entity.OccupancyEvent;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface OccupancyEventMapper {

    @Mapping(source = "space.id", target = "spaceId")
    @Mapping(source = "space.code", target = "spaceCode")
    @Mapping(source = "space.zone.id", target = "zoneId")
    @Mapping(source = "space.zone.name", target = "zoneName")
    @Mapping(source = "actorUser.id", target = "actorUserId")
    @Mapping(source = "actorUser.fullName", target = "actorName")
    @Mapping(source = "device.id", target = "deviceId")
    @Mapping(source = "device.name", target = "deviceName")
    OccupancyEventResponse toResponse(OccupancyEvent entity);
}
