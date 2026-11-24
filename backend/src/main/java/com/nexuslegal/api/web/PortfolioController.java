package com.nexuslegal.api.web;

import com.nexuslegal.api.application.PortfolioService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api")
@SecurityRequirement(name = "basicAuth")
@CrossOrigin(origins = "*")
public class PortfolioController {
    private final PortfolioService service;

    public PortfolioController(PortfolioService service) {
        this.service = service;
    }

    public record DocumentRequest(Long matterId, Long companyId, @NotBlank String title, @NotBlank String category,
            @NotBlank String content) {
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication auth) {
        return service.me(auth.getName());
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(Authentication auth) {
        return service.dashboard(auth);
    }

    @GetMapping("/companies")
    public List<Map<String, Object>> companies(Authentication auth) {
        return service.companies(auth);
    }

    @GetMapping("/companies/{id}")
    public Map<String, Object> company(@PathVariable long id, Authentication auth) {
        return service.company(id, auth);
    }

    @GetMapping("/matters")
    public List<Map<String, Object>> matters(Authentication auth) {
        return service.matters(auth);
    }

    @PutMapping("/matters/{id}/status")
    public Map<String, Object> status(@PathVariable long id, @RequestParam String value) {
        service.updateMatter(id, value);
        return Map.of("updated", true, "id", id, "status", value);
    }

    @GetMapping("/obligations")
    public List<Map<String, Object>> obligations(Authentication auth) {
        return service.obligations(auth);
    }

    @GetMapping("/documents")
    public List<Map<String, Object>> documents(Authentication auth) {
        return service.documents(auth);
    }

    @PostMapping("/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> document(@RequestBody @Valid DocumentRequest r, Authentication auth) {
        service.insertDocument(r.matterId(), r.companyId(), r.title(), r.category(), r.content(), auth.getName());
        return Map.of("created", true);
    }

    @GetMapping("/tasks")
    public List<Map<String, Object>> tasks(Authentication auth) {
        return service.tasks(auth);
    }

    @GetMapping("/audit")
    public List<Map<String, Object>> audit() {
        return service.audit();
    }

    @GetMapping("/search")
    public List<Map<String, Object>> search(@RequestParam String q, Authentication auth) {
        return service.search(q, auth);
    }
}
