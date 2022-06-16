'use strict';

const insertChargeVersionMetadata = `
insert into water_import.charge_versions_metadata
(external_id, version_number, start_date, end_date, status, is_nald_gap, date_created)
values ($1, $2, $3, $4, $5, $6, NOW())
on conflict (external_id) do update set
  version_number=EXCLUDED.version_number,
  start_date=EXCLUDED.start_date,
  end_date=EXCLUDED.end_date,
  status=EXCLUDED.status,
  is_nald_gap=EXCLUDED.is_nald_gap,
  date_updated=NOW();
`;

module.exports = {
  insertChargeVersionMetadata
};
