package com.nexuslegal.api.web;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
public class ApiController {

    @GetMapping({ "/", "/api" })
    public Map<String, String> info() {
        return Map.of("name", "NexusLegal", "version", "1.0.0", "docs", "/swagger-ui/index.html");
    }
}
