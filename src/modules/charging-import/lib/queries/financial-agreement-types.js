const importFinancialAgreementTypes = `
INSERT INTO water.financial_agreement_types (id, description, disabled, date_created, date_updated)
SELECT a."CODE", a."DESCR", a."DISABLED"::boolean, now(), now()
FROM import."NALD_FIN_AGRMNT_TYPES" a
ON CONFLICT (id)
DO
  UPDATE
  SET
    description= excluded.description,
    date_updated = now();
`;

exports.importFinancialAgreementTypes = importFinancialAgreementTypes;
