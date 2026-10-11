package com.parking.platform.mapper;

import com.parking.platform.dto.request.MonitoringDeviceRequest;
import com.parking.platform.dto.response.MonitoringDeviceResponse;
import com.parking.platform.entity.MonitoringDevice;
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
public interface MonitoringDeviceMapper {

    @Mapping(source = "zone.id", target = "zoneId")
    @Mapping(source = "zone.name", target = "zoneName")
    MonitoringDeviceResponse toResponse(MonitoringDevice entity);

    MonitoringDevice toEntity(MonitoringDeviceRequest request);

    void updateEntity(MonitoringDeviceRequest request, @MappingTarget MonitoringDevice entity);
}
