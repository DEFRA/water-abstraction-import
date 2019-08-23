const importPrimaryPurposes = `
INSERT INTO water.purposes_primary (id, description, date_created, date_updated)
SELECT p."CODE", p."DESCR", now(), now()
FROM import."NALD_PURP_PRIMS" p
ON CONFLICT (id)
DO
  UPDATE
  SET
    description= excluded.description,
    date_updated = now();
`;

const importSecondaryPurposes = `
INSERT INTO water.purposes_secondary (id, description, date_created, date_updated)
SELECT p."CODE", p."DESCR", now(), now()
FROM import."NALD_PURP_SECS" p
ON CONFLICT (id)
DO
  UPDATE
  SET
    description= excluded.description,
    date_updated = now();
`;

const importUses = `
INSERT INTO water.purposes_uses (id, description, date_created, date_updated)
SELECT p."CODE", p."DESCR", now(), now()
FROM import."NALD_PURP_USES" p
ON CONFLICT (id)
DO
  UPDATE
  SET
    description= excluded.description,
    date_updated = now();
`;

exports.importPrimaryPurposes = importPrimaryPurposes;
exports.importSecondaryPurposes = importSecondaryPurposes;
exports.importUses = importUses;
