package com.parking.platform.mapper;

import com.parking.platform.dto.request.VehicleRequest;
import com.parking.platform.dto.response.VehicleResponse;
import com.parking.platform.entity.Vehicle;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface VehicleMapper {

    @Mapping(source = "owner.id", target = "ownerId")
    @Mapping(source = "owner.fullName", target = "ownerName")
    VehicleResponse toResponse(Vehicle entity);

    Vehicle toEntity(VehicleRequest request);

    void updateEntity(VehicleRequest request, @MappingTarget Vehicle entity);
}
