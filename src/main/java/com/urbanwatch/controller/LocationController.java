package com.urbanwatch.controller;

import com.urbanwatch.dto.GeocodeResponse;
import com.urbanwatch.dto.ReverseGeocodeResponse;
import com.urbanwatch.service.LocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/location")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    // GET /location/geocode?endereco=X — converte endereço em coordenadas
    @GetMapping("/geocode")
    public ResponseEntity<GeocodeResponse> geocode(@RequestParam String endereco) {
        return ResponseEntity.ok(locationService.geocode(endereco));
    }

    // GET /location/reverse?latitude=X&longitude=Y — converte coordenadas em endereço
    @GetMapping("/reverse")
    public ResponseEntity<ReverseGeocodeResponse> reverse(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {
        return ResponseEntity.ok(locationService.reverseGeocode(latitude, longitude));
    }
}