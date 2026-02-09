'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await db.query(`
    WITH licence_holders AS (
      SELECT
        lv.licence_version_id,
        concat_ws(':', np."FGAC_REGION_CODE", np."ID") AS external_id,
        (CASE
          WHEN np."APAR_TYPE" = 'ORG' THEN 'organisation'
          ELSE 'person'
        END) AS holder_type,
        nullif(np."SALUTATION", 'null') AS salutation,
        nullif(np."INITIALS", 'null') AS initials,
        nullif(np."FORENAME", 'null') AS forename,
        nullif(np."NAME", 'null') AS name,
        nullif(na."ADDR_LINE1", 'null') AS address_line_1,
        nullif(na."ADDR_LINE2", 'null') AS address_line_2,
        nullif(na."ADDR_LINE3", 'null') AS address_line_3,
        nullif(na."ADDR_LINE4", 'null') AS address_line_4,
        nullif(na."TOWN", 'null') AS town,
        nullif(na."COUNTY", 'null') AS county,
        nullif(na."COUNTRY", 'null') AS country,
        nullif(na."POSTCODE", 'null') AS postcode,
        nullif(np."REF", 'null') AS reference,
        nullif(np."DESCR", 'null') AS description,
        nullif(np."LOCAL_NAME", 'null') AS local_name,
        (CASE
          WHEN np."LAST_CHANGED" = 'null' THEN NULL
          ELSE to_date(np."LAST_CHANGED", 'DD/MM/YYYY')
        END) AS last_changed,
        (CASE
          WHEN np."DISABLED" = 'N' THEN FALSE
          ELSE TRUE
        END) AS disabled
      FROM
        "import"."NALD_ABS_LIC_VERSIONS" nalv
      INNER JOIN
        "import"."NALD_PARTIES" np
        ON np."ID" = nalv."ACON_APAR_ID" AND np."FGAC_REGION_CODE" = nalv."FGAC_REGION_CODE"
      INNER JOIN
        "import"."NALD_ADDRESSES" na
        ON na."ID" = nalv."ACON_AADD_ID" AND na."FGAC_REGION_CODE" = nalv."FGAC_REGION_CODE"
      INNER JOIN
        water.licence_versions lv
        ON lv.external_id = concat_ws(':', nalv."FGAC_REGION_CODE", nalv."AABL_ID", nalv."ISSUE_NO", nalv."INCR_NO")
      WHERE
        nalv."STATUS" <> 'DRAFT'
    ),
    derived_values AS (
      SELECT
        lh.licence_version_id,
        lh.external_id,
        lh.holder_type,
        lh.salutation,
        lh.initials,
        lh.forename,
        lh."name",
        lh.address_line_1,
        lh.address_line_2,
        lh.address_line_3,
        lh.address_line_4,
        lh.town,
        lh.county,
        lh.country,
        lh.postcode,
        lh.reference,
        lh.description,
        lh.local_name,
        lh.last_changed,
        lh.disabled,
        concat_ws(
          ' ',
          lh.salutation,
          (CASE
            WHEN lh.initials IS NULL THEN lh.forename
            ELSE lh.initials
          END),
          lh."name"
        ) AS derived_name,
        c.company_id
      FROM
        licence_holders lh
      LEFT JOIN
        crm_v2.companies c
        ON c.external_id = lh.external_id
    )
    INSERT INTO water.licence_version_holders (
      licence_version_id,
      holder_type,
      salutation,
      initials,
      forename,
      name,
      address_line_1,
      address_line_2,
      address_line_3,
      address_line_4,
      town,
      county,
      country,
      postcode,
      reference,
      description,
      local_name,
      last_changed,
      disabled,
      derived_name,
      external_id,
      company_id,
      created_at,
      updated_at
    )
    SELECT
      dv.licence_version_id,
      dv.holder_type,
      dv.salutation,
      dv.initials,
      dv.forename,
      dv."name",
      dv.address_line_1,
      dv.address_line_2,
      dv.address_line_3,
      dv.address_line_4,
      dv.town,
      dv.county,
      dv.country,
      dv.postcode,
      dv.reference,
      dv.description,
      dv.local_name,
      dv.last_changed,
      dv.disabled,
      dv.derived_name,
      dv.external_id,
      dv.company_id,
      NOW() AS created_at,
      NOW() AS updated_at
    FROM
      derived_values dv
    ON CONFLICT(licence_version_id)
    DO UPDATE SET
      holder_type = excluded.holder_type,
      salutation = excluded.salutation,
      initials = excluded.initials,
      forename = excluded.forename,
      name = excluded.name,
      address_line_1 = excluded.address_line_1,
      address_line_2 = excluded.address_line_2,
      address_line_3 = excluded.address_line_3,
      address_line_4 = excluded.address_line_4,
      town = excluded.town,
      county = excluded.county,
      country = excluded.country,
      postcode= excluded.postcode,
      reference = excluded.reference,
      description = excluded.description,
      local_name = excluded.local_name,
      last_changed = excluded.last_changed,
      disabled = excluded.disabled,
      derived_name = excluded.derived_name,
      external_id = excluded.external_id,
      company_id = excluded.company_id,
      updated_at = excluded.updated_at;
  `)
}

module.exports = {
  go
}
