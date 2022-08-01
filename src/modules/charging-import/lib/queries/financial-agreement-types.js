const importFinancialAgreementTypes = `
INSERT INTO water.financial_agreement_types (financial_agreement_code, description, disabled, date_created, date_updated)
SELECT a."CODE", a."DESCR", a."DISABLED"::boolean, now(), now()
FROM import."NALD_FIN_AGRMNT_TYPES" a
ON CONFLICT (financial_agreement_code)
DO
  UPDATE
  SET
    description = excluded.description,
    disabled = excluded.disabled,
    date_updated = now();
`

module.exports = {
  importFinancialAgreementTypes
}
