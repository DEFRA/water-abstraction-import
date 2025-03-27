'use strict'

const db = require('../connectors/db.js')

async function go (licence) {
  const { FGAC_REGION_CODE: regionCode, ID: id } = licence

  const params = [id, regionCode]
  const query = `
    SELECT
      row_to_json(r.*) AS role_detail,
      row_to_json(t.*) AS role_type,
      row_to_json(p.*) AS role_party,
      row_to_json(a.*) AS role_address,
      array(
        SELECT row_to_json(x.*) AS contact_data FROM (
          SELECT
            *
          FROM
            "import"."NALD_CONT_NOS" c
          LEFT JOIN
            "import"."NALD_CONT_NO_TYPES" ct ON c."ACNT_CODE" = ct."CODE"
          WHERE
            r."ACON_APAR_ID" = c."ACON_APAR_ID"
            AND r."ACON_AADD_ID" = c."ACON_AADD_ID"
            AND c."FGAC_REGION_CODE" = $2
        ) x
      )
    FROM
      "import"."NALD_LIC_ROLES" r
    LEFT JOIN
      "import"."NALD_LIC_ROLE_TYPES" t ON r."ALRT_CODE" = t."CODE"
    LEFT JOIN
      "import"."NALD_PARTIES" p ON p."ID" = r."ACON_APAR_ID" AND p."FGAC_REGION_CODE" = r."FGAC_REGION_CODE"
    LEFT JOIN
      "import"."NALD_ADDRESSES" a ON a."ID" = r."ACON_AADD_ID" AND a."FGAC_REGION_CODE" = r."FGAC_REGION_CODE"
    WHERE
      r."AABL_ID"=$1
      AND r."FGAC_REGION_CODE" = $2;
  `

  return db.query(query, params)
}

module.exports = {
  go
}
