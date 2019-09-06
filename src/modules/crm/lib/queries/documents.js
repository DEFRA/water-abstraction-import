const importDocumentHeaders = `
INSERT INTO crm_v2.documents (regime, document_type, document_ref,
  version_number, start_date, end_date, status, external_id)
SELECT
  'water' AS regime,
  'abstraction_licence' AS document_type,
  l."LIC_NO" AS document_ref,
  v2."ISSUE_NO"::integer AS version_number,
  to_date(v2."EFF_ST_DATE", 'DD/MM/YYYY') AS start_date,
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
    || v2."INCR_NO" AS external_id
FROM import."NALD_ABS_LICENCES" l
JOIN (
  SELECT v."AABL_ID", v."ISSUE_NO", v."FGAC_REGION_CODE",
  MAX(v."INCR_NO"::integer)::varchar AS "INCR_NO"
  FROM import."NALD_ABS_LIC_VERSIONS" v
  GROUP BY v."AABL_ID", v."ISSUE_NO", v."FGAC_REGION_CODE"
) v ON l."ID"=v."AABL_ID" AND l."FGAC_REGION_CODE"=v."FGAC_REGION_CODE"
JOIN import."NALD_ABS_LIC_VERSIONS" v2 ON v."AABL_ID"=v2."AABL_ID"
  AND v."ISSUE_NO"=v2."ISSUE_NO" AND v."FGAC_REGION_CODE"=v2."FGAC_REGION_CODE"
  AND v."INCR_NO"=v2."INCR_NO"
ON CONFLICT (regime, document_type, version_number, document_ref)
  DO UPDATE SET start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date,
  status=EXCLUDED.status, external_id=EXCLUDED.external_id`;

exports.importDocumentHeaders = importDocumentHeaders;
