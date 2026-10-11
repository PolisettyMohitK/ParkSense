package com.parking.platform.mapper;

import com.parking.platform.dto.request.ParkingSpaceRequest;
import com.parking.platform.dto.response.ParkingSpaceResponse;
import com.parking.platform.entity.ParkingSpace;
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
public interface ParkingSpaceMapper {

    @Mapping(source = "zone.id", target = "zoneId")
    @Mapping(source = "zone.name", target = "zoneName")
    ParkingSpaceResponse toResponse(ParkingSpace entity);

    @Mapping(target = "occupancyState", ignore = true)
    @Mapping(target = "reserved", ignore = true)
    ParkingSpace toEntity(ParkingSpaceRequest request);

    @Mapping(target = "occupancyState", ignore = true)
    @Mapping(target = "reserved", ignore = true)
    void updateEntity(ParkingSpaceRequest request, @MappingTarget ParkingSpace entity);
}
