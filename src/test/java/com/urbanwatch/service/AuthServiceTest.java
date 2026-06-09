package com.urbanwatch.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.urbanwatch.dto.RegisterRequest;
import com.urbanwatch.dto.UserResponse;
import com.urbanwatch.entity.Role;
import com.urbanwatch.entity.User;
import com.urbanwatch.exception.EmailAlreadyExistsException;
import com.urbanwatch.mapper.UserMapper;
import com.urbanwatch.repository.UserRepository;
import com.urbanwatch.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private UserMapper userMapper;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository, passwordEncoder, jwtService, authenticationManager, userMapper);
    }

    @Test
    @DisplayName("register forca o perfil CITIZEN no auto-registro publico (C1)")
    void register_alwaysAssignsCitizenRole() {
        when(userRepository.existsByEmail("alice@x.com")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken(any())).thenReturn("token");
        when(userMapper.toResponse(any(User.class)))
                .thenReturn(new UserResponse(1L, "Alice", "alice@x.com", Role.CITIZEN, null));

        authService.register(new RegisterRequest("Alice", "  Alice@X.com ", "secret123"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();

        assertThat(saved.getRole()).isEqualTo(Role.CITIZEN);
        assertThat(saved.getEmail()).isEqualTo("alice@x.com");
        assertThat(saved.getPassword()).isEqualTo("hashed");
    }

    @Test
    @DisplayName("register rejeita email ja cadastrado e nao persiste")
    void register_duplicateEmail_throwsAndDoesNotSave() {
        when(userRepository.existsByEmail("dup@x.com")).thenReturn(true);

        assertThatThrownBy(() ->
                authService.register(new RegisterRequest("Bob", "dup@x.com", "secret123")))
                .isInstanceOf(EmailAlreadyExistsException.class);

        verify(userRepository, never()).save(any(User.class));
    }
}
