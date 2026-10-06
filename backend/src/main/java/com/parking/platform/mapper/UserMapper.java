package com.parking.platform.mapper;

import com.parking.platform.dto.request.UserRequest;
import com.parking.platform.dto.response.UserResponse;
import com.parking.platform.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    @Mapping(source = "organization.id", target = "organizationId")
    @Mapping(source = "organization.name", target = "organizationName")
    UserResponse toResponse(User entity);

    User toEntity(UserRequest request);

    void updateEntity(UserRequest request, @MappingTarget User entity);
}
