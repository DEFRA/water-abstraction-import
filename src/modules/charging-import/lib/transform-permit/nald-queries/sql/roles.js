'use strict'

const getRoles = `
  select
    row_to_json(r.*) AS role_detail,
    row_to_json(t.*) AS role_type,
    row_to_json(p.*) AS role_party,
    row_to_json(a.*) AS role_address,
    array(
      select row_to_json(x.*) AS contact_data from (
        select *
        from import."NALD_CONT_NOS" c
          left join import."NALD_CONT_NO_TYPES" ct
            on c."ACNT_CODE"=ct."CODE"
        where r."ACON_APAR_ID"=c."ACON_APAR_ID"
        and r."ACON_AADD_ID" = c."ACON_AADD_ID"
        and c."FGAC_REGION_CODE" = $2
      ) x
    )
    from import."NALD_LIC_ROLES" r
      left join import."NALD_LIC_ROLE_TYPES" t on r."ALRT_CODE"=t."CODE"
      left join import."NALD_PARTIES" p on r."ACON_APAR_ID"=p."ID"
      left join import."NALD_ADDRESSES" a on r."ACON_AADD_ID"=a."ID"
    where r."AABL_ID"=$1
    and r."FGAC_REGION_CODE" = $2
    and p."FGAC_REGION_CODE" = $2
    and a."FGAC_REGION_CODE" = $2
    and (r."EFF_END_DATE" = 'null' or to_date(r."EFF_END_DATE", 'DD/MM/YYYY') > now());
`

module.exports = {
  getRoles
}
