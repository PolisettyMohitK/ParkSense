package com.parking.platform.mapper;

import com.parking.platform.dto.request.ParkingSiteRequest;
import com.parking.platform.dto.response.ParkingSiteResponse;
import com.parking.platform.entity.ParkingSite;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ParkingSiteMapper {

    @Mapping(source = "organization.id", target = "organizationId")
    @Mapping(source = "organization.name", target = "organizationName")
    ParkingSiteResponse toResponse(ParkingSite entity);

    ParkingSite toEntity(ParkingSiteRequest request);

    void updateEntity(ParkingSiteRequest request, @MappingTarget ParkingSite entity);
}
