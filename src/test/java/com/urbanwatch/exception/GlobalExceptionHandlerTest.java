package com.urbanwatch.exception;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.resource.NoResourceFoundException;

class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new ThrowingController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("CallNotFoundException e mapeada para HTTP 404 (H5)")
    void callNotFound_returns404() throws Exception {
        mockMvc.perform(get("/test/call-missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("NoResourceFoundException e mapeada para HTTP 404 (nao 500)")
    void noResource_returns404() throws Exception {
        mockMvc.perform(get("/test/no-resource"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("LocationNotFoundException e mapeada para HTTP 404 (nao 500)")
    void locationNotFound_returns404() throws Exception {
        mockMvc.perform(get("/test/location-missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("parametro obrigatorio ausente retorna 400 (nao 500)")
    void missingParam_returns400() throws Exception {
        mockMvc.perform(get("/test/need-param"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @DisplayName("corpo JSON invalido retorna 400 (nao 500)")
    void badBody_returns400() throws Exception {
        mockMvc.perform(post("/test/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ invalido "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @RestController
    static class ThrowingController {
        @GetMapping("/test/call-missing")
        public void boom() {
            throw new CallNotFoundException(99L);
        }

        @GetMapping("/test/no-resource")
        public void missingResource() throws NoResourceFoundException {
            throw new NoResourceFoundException(HttpMethod.GET, "/test/no-resource");
        }

        @GetMapping("/test/location-missing")
        public void locationMissing() {
            throw new LocationNotFoundException("Rua Inexistente, 99999-999");
        }

        @GetMapping("/test/need-param")
        public void needParam(@RequestParam String obrigatorio) {
        }

        @PostMapping("/test/body")
        public void body(@RequestBody Map<String, String> corpo) {
        }
    }
}
