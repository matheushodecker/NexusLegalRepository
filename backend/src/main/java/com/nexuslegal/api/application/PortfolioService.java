package com.nexuslegal.api.application;

import com.nexuslegal.api.domain.PortfolioRepository;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class PortfolioService {
    private final PortfolioRepository repo;

    public PortfolioService(PortfolioRepository repo) {
        this.repo = repo;
    }

    public static boolean isClient(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().startsWith("ROLE_CLIENT_"));
    }

    private List<Long> scope(Authentication auth) {
        return isClient(auth) ? repo.companiesOf(auth.getName()) : null;
    }

    public Map<String, Object> me(String username) {
        return repo.user(username);
    }

    public Map<String, Object> dashboard(Authentication auth) {
        return repo.dashboard(scope(auth));
    }

    public List<Map<String, Object>> companies(Authentication auth) {
        return repo.companies(scope(auth));
    }

    public List<Map<String, Object>> matters(Authentication auth) {
        return repo.matters(scope(auth));
    }

    public List<Map<String, Object>> obligations(Authentication auth) {
        return repo.obligations(scope(auth));
    }

    public List<Map<String, Object>> documents(Authentication auth) {
        return repo.documents(scope(auth));
    }

    public List<Map<String, Object>> tasks(Authentication auth) {
        return isClient(auth) ? List.of() : repo.tasks();
    }

    public List<Map<String, Object>> audit() {
        return repo.audit();
    }

    public List<Map<String, Object>> search(String q, Authentication auth) {
        List<Map<String, Object>> rows = repo.search(q == null ? "" : q);
        List<Long> ids = scope(auth);
        if (ids == null)
            return rows;
        return rows.stream()
                .filter(r -> !"Pessoa física".equals(r.get("segment"))
                        && ids.contains(((Number) r.get("id")).longValue()))
                .toList();
    }

    public Map<String, Object> company(long id, Authentication auth) {
        List<Long> ids = scope(auth);
        if (ids != null && !ids.contains(id))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso não permitido");
        try {
            return repo.company(id);
        } catch (EmptyResultDataAccessException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada");
        }
    }

    private static final Set<String> MATTER_STATUSES = Set.of("ACTIVE", "IN_REVIEW", "HEARING", "PENDING", "CLOSED");

    public void updateMatter(long id, String status) {
        if (!MATTER_STATUSES.contains(status))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status inválido");
        if (repo.updateMatter(id, status) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Processo não encontrado");
    }

    public void insertDocument(Long matter, Long company, String title, String category, String content, String user) {
        if (company != null && !repo.companyExists(company))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empresa não encontrada");
        if (matter != null) {
            Long matterCompany = repo.matterCompany(matter)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Processo não encontrado"));
            if (!Objects.equals(matterCompany == -1L ? null : matterCompany, company))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O processo é de outro cliente");
        }
        repo.insertDocument(1L, matter, company, title, category, content, user);
    }
}
