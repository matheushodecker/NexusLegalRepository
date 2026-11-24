ALTER TABLE companies ADD COLUMN client_organization_id BIGINT REFERENCES organizations(id);
UPDATE companies c SET client_organization_id = o.id
  FROM organizations o
 WHERE o.type = 'COMPANY' AND o.name = c.legal_name;
