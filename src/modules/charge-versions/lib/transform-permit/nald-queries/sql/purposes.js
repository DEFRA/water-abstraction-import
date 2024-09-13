'use strict'

const getPurposePoints = `
  select
    pp.*,
    row_to_json(m.*) as means_of_abstraction,
    row_to_json(p.*) as point_detail,
    row_to_json(s.*) as point_source
  from
    import."NALD_ABS_PURP_POINTS" pp
      left join import."NALD_MEANS_OF_ABS" m on m."CODE" = pp."AMOA_CODE"
      left join import."NALD_POINTS" p on p."ID" = pp."AAIP_ID"
      left join import."NALD_SOURCES" s on s."CODE" = p."ASRC_CODE"
  where pp."AABP_ID" = $1
  and pp."FGAC_REGION_CODE" = $2
  and p."FGAC_REGION_CODE" = $2;
`

const getPurpose = `
  select
    row_to_json(p1.*) AS purpose_primary,
    row_to_json(p2.*) AS purpose_secondary,
    row_to_json(p3.*) AS purpose_tertiary
  from
  import."NALD_PURP_PRIMS" p1
    left join import."NALD_PURP_SECS" p2 on p2."CODE" = $2
    left join import."NALD_PURP_USES" p3 on p3."CODE" = $3
  where p1."CODE" = $1;
`
const getPurposePointLicenceAgreements = `
  select *
  from import."NALD_LIC_AGRMNTS"
  where "AABP_ID" = $1 and "FGAC_REGION_CODE" = $2;
`

const getPurposePointLicenceConditions = `
  select c.*, row_to_json(ct.*) as condition_type
  from import."NALD_LIC_CONDITIONS" c
    left join import."NALD_LIC_COND_TYPES" ct
      on ct."CODE" = c."ACIN_CODE"
      and ct."SUBCODE" = c."ACIN_SUBCODE"
  where c."AABP_ID" = $1 and c."FGAC_REGION_CODE" = $2
  order by "DISP_ORD" asc;
`

module.exports = {
  getPurpose,
  getPurposePoints,
  getPurposePointLicenceAgreements,
  getPurposePointLicenceConditions
}
