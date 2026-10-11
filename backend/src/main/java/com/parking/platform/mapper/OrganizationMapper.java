package com.parking.platform.mapper;

import com.parking.platform.dto.request.OrganizationRequest;
import com.parking.platform.dto.response.OrganizationResponse;
import com.parking.platform.entity.Organization;
import org.mapstruct.Mapper;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface OrganizationMapper {

    OrganizationResponse toResponse(Organization entity);

    Organization toEntity(OrganizationRequest request);

    void updateEntity(OrganizationRequest request, @MappingTarget Organization entity);
}
