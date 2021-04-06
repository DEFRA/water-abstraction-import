'use strict';

const importPrimaryPurposes = `insert into water.purposes_primary (legacy_id, description, date_created, date_updated)
  select p."CODE", p."DESCR", now(), now()
  from import."NALD_PURP_PRIMS" p on conflict (legacy_id) do update set
    description= excluded.description,
    date_updated = now();`;

const importSecondaryPurposes = `
  insert into water.purposes_secondary (legacy_id, description, date_created, date_updated)
  select p."CODE", p."DESCR", now(), now()
  from import."NALD_PURP_SECS" p on conflict (legacy_id) do update set
  description= excluded.description, date_updated = now();`;

const importUses = `insert into water.purposes_uses (
    legacy_id,
    description,
    date_created,
    date_updated,
    loss_factor,
    is_two_part_tariff) select
    p."CODE",
    p."DESCR",
    now(),
    now(),
    case
      when p."ALSF_CODE" = 'V' then 'very low'::water.charge_element_loss
      when p."ALSF_CODE" = 'L' then 'low'::water.charge_element_loss
      when p."ALSF_CODE" = 'M' then 'medium'::water.charge_element_loss
      when p."ALSF_CODE" = 'H' then 'high'::water.charge_element_loss
      when p."ALSF_CODE" = 'N' then 'non-chargeable'::water.charge_element_loss
    end,
    case
      when p."CODE" in ('380', '390', '400', '410', '420', '600', '620') then true
      else false
    end
  from import."NALD_PURP_USES" p on conflict (legacy_id) do update set
    description= excluded.description,
    date_updated = now(),
    loss_factor = excluded.loss_factor,
    is_two_part_tariff = excluded.is_two_part_tariff;`;

const importValidPurposeCombinations = `INSERT INTO water.purposes as prps (purpose_primary_id, purpose_secondary_id, purpose_use_id, date_created)
SELECT pp.purpose_primary_id,
ps.purpose_secondary_id,
pu.purpose_use_id,
now()
FROM import."NALD_PURPOSES" as NALD_P
JOIN water.purposes_primary as pp ON NALD_P."APPR_CODE" = pp."legacy_id"
JOIN water.purposes_secondary as ps ON NALD_P."APSE_CODE" = ps."legacy_id"
JOIN water.purposes_uses as pu ON NALD_P."APUS_CODE" = pu."legacy_id"
WHERE NALD_P."DISABLED" = 'N' ON CONFLICT DO NOTHING;`;

exports.importPrimaryPurposes = importPrimaryPurposes;
exports.importSecondaryPurposes = importSecondaryPurposes;
exports.importUses = importUses;
exports.importValidPurposeCombinations = importValidPurposeCombinations;
