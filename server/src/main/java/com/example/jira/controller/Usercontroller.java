package com.example.jira.controller;

import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.jira.dto.ApiResponse;
import com.example.jira.model.User;
import com.example.jira.repository.UserRepository;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/users")
public class Usercontroller {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // =========================
    // SIGNUP
    // =========================
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse> signup(@RequestBody User user) {
        try {
            // Validate input
            if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
                return new ResponseEntity<>(
                    new ApiResponse(false, "Email is required"),
                    HttpStatus.BAD_REQUEST
                );
            }

            if (user.getPassword() == null || user.getPassword().length() < 6) {
                return new ResponseEntity<>(
                    new ApiResponse(false, ProfileController.strongPasswordMessage()),
                    HttpStatus.BAD_REQUEST
                );
            }

            if (!ProfileController.isStrongPassword(user.getPassword())) {
                return new ResponseEntity<>(
                    new ApiResponse(false, ProfileController.strongPasswordMessage()),
                    HttpStatus.BAD_REQUEST
                );
            }

            if (userRepository.findByEmail(user.getEmail()).isPresent()) {
                return new ResponseEntity<>(
                    new ApiResponse(false, "Email already exists"),
                    HttpStatus.CONFLICT
                );
            }

            user.setPassword(passwordEncoder.encode(user.getPassword()));
            user.setRole(user.getRole() == null ? "USER" : user.getRole());
            user.setActive(true);
            user.setEmailVerified(true);

            User savedUser = userRepository.save(user);
            return new ResponseEntity<>(
                new ApiResponse(true, "Signup successful", savedUser),
                HttpStatus.CREATED
            );
        } catch (Exception e) {
            return new ResponseEntity<>(
                new ApiResponse(false, "Signup failed: " + e.getMessage()),
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // =========================
    // LOGIN
    // =========================
    @PostMapping("/login")
    public ResponseEntity<ApiResponse> login(@RequestBody User loginRequest) {
        try {
            // Validate input
            if (loginRequest.getEmail() == null || loginRequest.getEmail().trim().isEmpty()) {
                return new ResponseEntity<>(
                    new ApiResponse(false, "Email is required"),
                    HttpStatus.BAD_REQUEST
                );
            }

            if (loginRequest.getPassword() == null || loginRequest.getPassword().isEmpty()) {
                return new ResponseEntity<>(
                    new ApiResponse(false, "Password is required"),
                    HttpStatus.BAD_REQUEST
                );
            }

            User user = userRepository.findByEmail(loginRequest.getEmail())
                    .orElse(null);

            if (user == null) {
                return new ResponseEntity<>(
                    new ApiResponse(false, "User not found"),
                    HttpStatus.UNAUTHORIZED
                );
            }

            if (!user.isActive()) {
                return new ResponseEntity<>(
                    new ApiResponse(false, "Account is deactivated"),
                    HttpStatus.FORBIDDEN
                );
            }

            if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
                return new ResponseEntity<>(
                    new ApiResponse(false, "Invalid password"),
                    HttpStatus.UNAUTHORIZED
                );
            }

            return new ResponseEntity<>(
                new ApiResponse(true, "Login successful", user),
                HttpStatus.OK
            );
        } catch (Exception e) {
            return new ResponseEntity<>(
                new ApiResponse(false, "Login failed: " + e.getMessage()),
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // =========================
    // GET USER BY ID
    // =========================
    @GetMapping("/{id}")
    public User getUserById(@PathVariable String id) {

        ObjectId objectId;
        try {
            objectId = new ObjectId(id);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid user id");
        }

        return userRepository.findById(objectId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // =========================
    // EDIT PROFILE
    // =========================
    @PutMapping("/{id}")
    public User editProfile(
            @PathVariable String id,
            @RequestBody User updatedUser) {

        ObjectId objectId;
        try {
            objectId = new ObjectId(id);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid user id");
        }

        User user = userRepository.findById(objectId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setName(updatedUser.getName());
        user.setGroup(updatedUser.getGroup());
        user.setAvatar(updatedUser.getAvatar());

        return userRepository.save(user);
    }

    @GetMapping("/search")
    public java.util.List<User> searchUsers(@org.springframework.web.bind.annotation.RequestParam String query) {
        return userRepository.findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(query, query);
    }
}
