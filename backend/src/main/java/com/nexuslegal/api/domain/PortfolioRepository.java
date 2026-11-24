package com.nexuslegal.api.domain;

import java.util.*;

public interface PortfolioRepository {
    Map<String, Object> user(String username);

    List<Long> companiesOf(String username);

    Map<String, Object> dashboard(List<Long> companyIds);

    List<Map<String, Object>> companies(List<Long> companyIds);

    List<Map<String, Object>> matters(List<Long> companyIds);

    List<Map<String, Object>> obligations(List<Long> companyIds);

    List<Map<String, Object>> documents(List<Long> companyIds);

    List<Map<String, Object>> tasks();

    List<Map<String, Object>> audit();

    List<Map<String, Object>> search(String term);

    Map<String, Object> company(long id);

    void updateMatter(long id, String status);

    void insertDocument(long orgId, Long matterId, Long companyId, String title, String category, String content,
            String user);
}
