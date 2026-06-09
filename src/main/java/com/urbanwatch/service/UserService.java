package com.urbanwatch.service;

import com.urbanwatch.dto.UserResponse;
import com.urbanwatch.entity.User;
import com.urbanwatch.mapper.UserMapper;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserMapper userMapper;

    public UserService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    public UserResponse getCurrentUser(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return userMapper.toResponse(user);
    }
}
