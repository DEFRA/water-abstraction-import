/* eslint-disable no-irregular-whitespace */
const importDocumentHeaders = `
INSERT INTO crm_v2.documents (regime, document_type, document_ref,
  version_number, start_date, end_date, status, external_id, date_created, date_updated)

SELECT
  'water' AS regime, 'abstraction_licence' AS document_type,
  l."LIC_NO" AS document_ref,
  v."ISSUE_NO"::integer AS version_number,
  v.start_date,
  LEAST(
    to_date(NULLIF(l."EXPIRY_DATE", 'null'), 'DD/MM/YYYY'),
    to_date(NULLIF(l."LAPSED_DATE", 'null'), 'DD/MM/YYYY'),
    to_date(NULLIF(l."REV_DATE", 'null'), 'DD/MM/YYYY'),
    to_date(NULLIF(v2."EFF_END_DATE", 'null'), 'DD/MM/YYYY')
  ) AS end_date,
  (CASE v2."STATUS"
    WHEN 'SUPER' THEN 'superseded'
    WHEN 'DRAFT' THEN 'draft'
    WHEN 'CURR' THEN 'current'
  END)::crm_v2.document_status AS status,
  l."FGAC_REGION_CODE" || ':' || l."ID" || ':' || v2."ISSUE_NO" || ':'
    || v2."INCR_NO" AS external_id,
  NOW(),
  NOW()

FROM import."NALD_ABS_LICENCES" l

LEFT JOIN (
  SELECT v."FGAC_REGION_CODE", v."AABL_ID", v."ISSUE_NO",
    MAX(v."INCR_NO"::integer)::varchar AS max_incr,
    MIN(to_date(v."EFF_ST_DATE", 'DD/MM/YYYY')) AS start_date
  FROM import."NALD_ABS_LIC_VERSIONS" v
  WHERE v."STATUS"<>'DRAFT'
  GROUP BY v."FGAC_REGION_CODE", v."AABL_ID", v."ISSUE_NO"
) v ON l."ID"=v."AABL_ID" AND l."FGAC_REGION_CODE"=v."FGAC_REGION_CODE"

JOIN import."NALD_ABS_LIC_VERSIONS" v2 ON v."FGAC_REGION_CODE"=v2."FGAC_REGION_CODE" AND v."AABL_ID"=v2."AABL_ID" AND v."ISSUE_NO"=v2."ISSUE_NO" AND v.max_incr=v2."INCR_NO"

ON CONFLICT (regime, document_type, version_number, document_ref)
  DO UPDATE SET start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date,
  status=EXCLUDED.status, external_id=EXCLUDED.external_id, date_updated=EXCLUDED.date_updated
`;

const getDocumentChargeVersions = `

SELECT d.document_id, ia.company_id, ia.invoice_account_id,
d.start_date, d.end_date, cv.start_date AS cv_start_date, cv.end_date AS cv_end_date,
r.role_id
FROM crm_v2.documents d
JOIN import."NALD_ABS_LIC_VERSIONS" lv ON
  SPLIT_PART(d.external_id, ':', 1)=lv."FGAC_REGION_CODE"
  AND SPLIT_PART(d.external_id, ':', 2)=lv."AABL_ID"
  AND SPLIT_PART(d.external_id, ':', 3)=lv."ISSUE_NO"
  AND SPLIT_PART(d.external_id, ':', 4)=lv."INCR_NO"
LEFT JOIN (

  SELECT cv."AIIA_IAS_CUST_REF", cv."AABL_ID", cv."FGAC_REGION_CODE", cv."STATUS",
    to_date(cv."EFF_ST_DATE", 'DD/MM/YYYY') AS start_date,
    to_date(NULLIF(cv."EFF_END_DATE", 'null'), 'DD/MM/YYYY') AS end_date
  FROM import."NALD_CHG_VERSIONS" cv

  JOIN (
    SELECT cv."AABL_ID", cv."EFF_ST_DATE", "FGAC_REGION_CODE",  MAX(cv."VERS_NO"::integer)::varchar AS max_version
    FROM import."NALD_CHG_VERSIONS" cv
    WHERE cv."STATUS" <> 'DRAFT'
    GROUP BY cv."EFF_ST_DATE", cv."AABL_ID", cv."FGAC_REGION_CODE"
  ) cv_inner ON cv."AABL_ID"=cv_inner."AABL_ID" AND cv."VERS_NO"=cv_inner.max_version AND cv."FGAC_REGION_CODE"=cv_inner."FGAC_REGION_CODE"

  ORDER BY to_date(cv."EFF_ST_DATE", 'DD/MM/YYYY'), cv."VERS_NO"::integer
) cv ON
  lv."AABL_ID"=cv."AABL_ID" AND cv."FGAC_REGION_CODE"=lv."FGAC_REGION_CODE"
  AND cv.start_date <= d.start_date
  AND (cv.end_date IS NULL OR cv.end_date>=d.start_date)
JOIN crm_v2.invoice_accounts ia ON cv."AIIA_IAS_CUST_REF"=ia.ias_account_number
JOIN crm_v2.roles r ON r.name='billing'
ORDER BY d.version_number 
`;

exports.importDocumentHeaders = importDocumentHeaders;
exports.getDocumentChargeVersions = getDocumentChargeVersions;
