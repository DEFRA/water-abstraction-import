'use strict';

const importReturnVersions = `insert into water.return_versions (licence_id, version_number, start_date, end_date, status, external_id, date_created, date_updated) select 
      l.licence_id, 
      nrv."VERS_NO"::integer as version_number, 
      to_date(nrv."EFF_ST_DATE", 'DD/MM/YYYY') as start_date,
      case nrv."EFF_END_DATE"
        when 'null' then null
        else to_date(nrv."EFF_END_DATE", 'DD/MM/YYYY')
        end AS end_date,
      (case nrv."STATUS"
        when 'SUPER' THEN 'superseded'
        when 'DRAFT' THEN 'draft'
        when 'CURR' THEN 'current'
        end
      )::water.return_version_status as status,
      concat_ws(':', nrv."FGAC_REGION_CODE", nrv."AABL_ID", nrv."VERS_NO")  AS external_id,
      NOW() as date_created,
      NOW() as date_updated from import."NALD_RET_VERSIONS" nrv join import."NALD_ABS_LICENCES" nl on nrv."AABL_ID"=nl."ID" AND nrv."FGAC_REGION_CODE"=nl."FGAC_REGION_CODE" join water.licences l on l.licence_ref=nl."LIC_NO"  on conflict (external_id) do update set  start_date=excluded.start_date,
      end_date=excluded.end_date,
      status=excluded.status,
      date_updated=excluded.date_updated;
`;

const importReturnRequirements = `insert into water.return_requirements  ( return_version_id, legacy_id,  abstraction_period_start_day, abstraction_period_start_month,
  abstraction_period_end_day,
  abstraction_period_end_month,
  site_description,
  description,
  is_summer,
  is_upload,
  external_id,
  returns_frequency,
  date_created,
  date_updated
  ) select  rv.return_version_id, 
  nrf."ID"::integer as legacy_id,
  nullif(nrf."ABS_PERIOD_ST_DAY", 'null')::smallint as abstraction_period_start_day,
  nullif(nrf."ABS_PERIOD_ST_MONTH", 'null')::smallint as abstraction_period_start_month,
  nullif(nrf."ABS_PERIOD_END_DAY", 'null')::smallint as abstraction_period_end_day,
  nullif(nrf."ABS_PERIOD_END_MONTH", 'null')::smallint as abstraction_period_end_month,
  nullif(nrf."SITE_DESCR", 'null') as site_description,
  nullif(nrf."DESCR", 'null') as description,
  nrf."FORM_PRODN_MONTH" in ('65', '45', '80') as is_summer,
  nrf."FORM_PRODN_MONTH" in ('65', '66') as is_upload,
  concat_ws(':', nrf."FGAC_REGION_CODE", nrf."ID") as external_id,
  (case nrf."ARTC_REC_FREQ_CODE"
    when 'D' then 'day'
    when 'W' then 'week'
    when 'F' then 'fortnight'
    when 'M' then 'month'
    when 'Q' then 'quarter'
    when 'A' then 'year'
    end
  )::water.returns_frequency as returns_frequency,
  now() as date_created,
  now() as date_updated from import."NALD_RET_FORMATS" nrf join water.return_versions rv on concat_ws(':', nrf."FGAC_REGION_CODE", nrf."ARVN_AABL_ID", nrf."ARVN_VERS_NO")=rv.external_id on conflict(external_id) do update  set
  abstraction_period_start_day=excluded.abstraction_period_start_day,
  abstraction_period_start_month=excluded.abstraction_period_start_month,
  abstraction_period_end_day=excluded.abstraction_period_end_day,
  abstraction_period_end_month=excluded.abstraction_period_end_month,
  site_description=excluded.site_description,
  description=excluded.description,
  is_summer=excluded.is_summer,
  is_upload=excluded.is_upload,
  returns_frequency=excluded.returns_frequency,
  date_updated=excluded.date_updated;`;

const importReturnRequirementPurposes = `insert into water.return_requirement_purposes (
  return_requirement_id,
  purpose_primary_id,
  purpose_secondary_id,
  purpose_use_id,
  external_id,
  purpose_alias,
  date_created,
  date_updated
) select  r.return_requirement_id,
p.purpose_primary_id, 
s.purpose_secondary_id, 
u.purpose_use_id,
concat_ws(':', nrp."FGAC_REGION_CODE", nrp."ARTY_ID", nrp."APUR_APPR_CODE", nrp."APUR_APSE_CODE", nrp."APUR_APUS_CODE") as external_id,
nullif(nrp."PURP_ALIAS", 'null') as purpose_alias,
now() as date_created,
now() as date_updated from import."NALD_RET_FMT_PURPOSES" nrp
join water.purposes_primary p on nrp."APUR_APPR_CODE"=p.legacy_id
join water.purposes_secondary s on nrp."APUR_APSE_CODE"=s.legacy_id
join water.purposes_uses u on nrp."APUR_APUS_CODE"=u.legacy_id
join water.return_requirements r on r.external_id = concat_ws(':', nrp."FGAC_REGION_CODE", nrp."ARTY_ID") on conflict(external_id) do update set  purpose_alias=excluded.purpose_alias, date_updated=excluded.date_updated;
`;

module.exports = {
  importReturnVersions,
  importReturnRequirements,
  importReturnRequirementPurposes
};
