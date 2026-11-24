package com.nexuslegal.api.infrastructure;

import com.nexuslegal.api.domain.PortfolioRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class JdbcPortfolioRepository implements PortfolioRepository {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;

    public JdbcPortfolioRepository(JdbcTemplate jdbc, NamedParameterJdbcTemplate named) {
        this.jdbc = jdbc;
        this.named = named;
    }

    private List<Map<String, Object>> list(String select, String scopeFilter, String order, List<Long> companyIds) {
        if (companyIds == null)
            return jdbc.queryForList(select + " " + order);
        if (companyIds.isEmpty())
            return List.of();
        return named.queryForList(select + " AND " + scopeFilter + " " + order, Map.of("ids", companyIds));
    }

    private long count(String select, String scopeFilter, List<Long> companyIds) {
        if (companyIds == null)
            return jdbc.queryForObject(select, Long.class);
        if (companyIds.isEmpty())
            return 0L;
        return named.queryForObject(select + " AND " + scopeFilter, Map.of("ids", companyIds), Long.class);
    }

    public Map<String, Object> user(String username) {
        return jdbc.queryForMap("SELECT username,full_name,role FROM users WHERE username=?", username);
    }

    public List<Long> companiesOf(String username) {
        return jdbc.queryForList(
                "SELECT c.id FROM companies c JOIN memberships m ON m.organization_id=c.client_organization_id JOIN users u ON u.id=m.user_id WHERE u.username=? AND m.status='ACTIVE' AND (m.expires_at IS NULL OR m.expires_at >= CURRENT_DATE)",
                Long.class, username);
    }

    public Map<String, Object> dashboard(List<Long> ids) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("companies", count("SELECT count(*) FROM companies c WHERE TRUE", "c.id IN (:ids)", ids));
        m.put("activeMatters", count("SELECT count(*) FROM matters m WHERE m.status <> 'CLOSED'",
                "m.client_type='COMPANY' AND m.client_id IN (:ids)", ids));
        m.put("pendingObligations",
                count("SELECT count(*) FROM obligations o WHERE o.status <> 'DONE'", "o.company_id IN (:ids)", ids));
        m.put("openTasks", ids == null
                ? jdbc.queryForObject("SELECT count(*) FROM tasks WHERE status <> 'DONE'", Long.class)
                : 0L);
        m.put("documents", count("SELECT count(*) FROM documents d WHERE TRUE", "d.company_id IN (:ids)", ids));
        return m;
    }

    public List<Map<String, Object>> companies(List<Long> ids) {
        return list("SELECT c.id,c.legal_name AS name,c.tax_id,c.segment,c.status,c.annual_revenue FROM companies c WHERE TRUE",
                "c.id IN (:ids)", "ORDER BY c.id", ids);
    }

    public List<Map<String, Object>> matters(List<Long> ids) {
        return list(
                "SELECT m.id,m.title,m.area,m.status,m.priority,m.next_deadline,m.value,u.full_name AS responsible,CASE WHEN m.client_type='COMPANY' THEN c.legal_name ELSE i.full_name END AS client FROM matters m LEFT JOIN users u ON u.id=m.responsible_user_id LEFT JOIN companies c ON m.client_type='COMPANY' AND c.id=m.client_id LEFT JOIN individual_clients i ON m.client_type='INDIVIDUAL' AND i.id=m.client_id WHERE TRUE",
                "m.client_type='COMPANY' AND m.client_id IN (:ids)", "ORDER BY m.next_deadline NULLS LAST", ids);
    }

    public List<Map<String, Object>> obligations(List<Long> ids) {
        return list(
                "SELECT o.id,o.title,o.obligation_type,o.due_date,o.status,o.amount,c.legal_name AS company,u.full_name AS responsible FROM obligations o JOIN companies c ON c.id=o.company_id LEFT JOIN users u ON u.id=o.responsible_user_id WHERE TRUE",
                "o.company_id IN (:ids)", "ORDER BY o.due_date", ids);
    }

    public List<Map<String, Object>> documents(List<Long> ids) {
        return list(
                "SELECT d.id,d.title,d.category,d.status,d.created_at,c.legal_name AS company,m.title AS matter,u.full_name AS owner,d.content FROM documents d LEFT JOIN companies c ON c.id=d.company_id LEFT JOIN matters m ON m.id=d.matter_id LEFT JOIN users u ON u.id=d.owner_user_id WHERE TRUE",
                "d.company_id IN (:ids)", "ORDER BY d.created_at DESC", ids);
    }

    public List<Map<String, Object>> tasks() {
        return jdbc.queryForList(
                "SELECT t.id,t.title,t.due_date,t.status,t.priority,u.full_name AS assigned FROM tasks t LEFT JOIN users u ON u.id=t.assigned_user_id ORDER BY t.due_date");
    }

    public List<Map<String, Object>> audit() {
        return jdbc.queryForList(
                "SELECT a.id,a.action,a.resource,a.details,a.created_at,u.full_name AS actor FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC");
    }

    public List<Map<String, Object>> search(String term) {
        String like = "%" + term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        return jdbc.queryForList(
                "SELECT id,legal_name AS name,tax_id,segment,status FROM companies WHERE legal_name ILIKE ? OR tax_id LIKE ? UNION ALL SELECT id,full_name AS name,document,'Pessoa física' AS segment,status FROM individual_clients WHERE full_name ILIKE ?",
                like, like, like);
    }

    public Map<String, Object> company(long id) {
        return jdbc.queryForMap(
                "SELECT c.*,o.name AS organization FROM companies c JOIN organizations o ON o.id=c.organization_id WHERE c.id=?",
                id);
    }

    public int updateMatter(long id, String status) {
        return jdbc.update("UPDATE matters SET status=? WHERE id=?", status, id);
    }

    public boolean companyExists(long id) {
        return jdbc.queryForObject("SELECT count(*) FROM companies WHERE id=?", Long.class, id) > 0;
    }

    public Optional<Long> matterCompany(long matterId) {
        return jdbc.query("SELECT CASE WHEN client_type='COMPANY' THEN client_id ELSE -1 END FROM matters WHERE id=?",
                (rs, i) -> rs.getLong(1), matterId).stream().findFirst();
    }

    public void insertDocument(long orgId, Long matterId, Long companyId, String title, String category, String content,
            String user) {
        Long owner = jdbc.queryForObject("SELECT id FROM users WHERE username=?", Long.class, user);
        jdbc.update(
                "INSERT INTO documents(organization_id,matter_id,company_id,title,category,content,owner_user_id) VALUES(?,?,?,?,?,?,?)",
                orgId, matterId, companyId, title, category, content, owner);
    }
}
