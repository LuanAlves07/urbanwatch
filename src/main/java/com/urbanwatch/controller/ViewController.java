package com.urbanwatch.controller;

import org.springframework.stereotype.Controller;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping("/login")
    public String loginPage() {
        return "login";
    }

    @GetMapping("/register")
    public String registerPage() {
        return "register";
    }

    @GetMapping("/account")
    public String accountPage() {
        return "account";
    }

    @PreAuthorize("hasRole('CITY_HALL') or hasRole('ADMIN')")
    @GetMapping("/prefeitura")
    public String cityHallPage() {
        return "city-hall";
    }

    @GetMapping("/")
    public String indexPage() {
        return "index";
    }

    @GetMapping("/index")
    public String indexAliasPage() {
        return "index";
    }
}
