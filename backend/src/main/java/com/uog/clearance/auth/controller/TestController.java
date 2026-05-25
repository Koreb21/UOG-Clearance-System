package com.uog.clearance.auth.controller;

import com.uog.clearance.user.model.User;
import com.uog.clearance.user.repository.UserRepository;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class TestController {
    private final UserRepository userRepo;

    @GetMapping("/api/v1/auth/test-debug")
    public String debug() {
        var allUsers = userRepo.findAll();
        String usernames = allUsers.stream().map(User::getUsername).collect(Collectors.joining(", "));
        return "DB: PostgreSQL | Count: " + allUsers.size() + " | Usernames: [" + usernames + "]";
    }
}
