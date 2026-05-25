package com.uog.clearance.user.controller;

import com.uog.clearance.common.dto.ActivationRequest;
import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.user.dto.CreateStaffUserRequest;
import com.uog.clearance.user.dto.ResetPasswordRequest;
import com.uog.clearance.user.dto.UpdateStaffUserRequest;
import com.uog.clearance.user.dto.UserResponse;
import com.uog.clearance.user.service.UserAdminService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/staff-users")
@RequiredArgsConstructor
public class UserAdminController {

    private final UserAdminService userAdminService;

    @PostMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public UserResponse createStaffUser(@Valid @RequestBody CreateStaffUserRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return userAdminService.createStaffUser(request, principal);
    }

    @GetMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public List<UserResponse> listStaffUsers() {
        return userAdminService.listStaffUsers();
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public UserResponse getStaffUser(@PathVariable String userId) {
        return userAdminService.getStaffUser(userId);
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public UserResponse updateStaffUser(@PathVariable String userId,
                                        @Valid @RequestBody UpdateStaffUserRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return userAdminService.updateStaffUser(userId, request, principal);
    }

    @PatchMapping("/{userId}/activate")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public UserResponse activateStaffUser(@PathVariable String userId,
                                          @RequestBody ActivationRequest request,
                                          @AuthenticationPrincipal UserPrincipal principal) {
        return userAdminService.activateStaffUser(userId, request.active(), principal);
    }

    @PatchMapping("/{userId}/reset-password")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public UserResponse resetStaffPassword(@PathVariable String userId,
                                           @Valid @RequestBody ResetPasswordRequest request,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return userAdminService.resetStaffPassword(userId, request.newPassword(), principal);
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public void deleteStaffUser(@PathVariable String userId,
                                @AuthenticationPrincipal UserPrincipal principal) {
        userAdminService.deleteStaffUser(userId, principal);
    }
}
