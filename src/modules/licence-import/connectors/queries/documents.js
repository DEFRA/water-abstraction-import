exports.deleteCrmV2Documents = `
  update crm_v2.documents
  set date_deleted = now()
  where document_ref not in (
    select l."LIC_NO"
    from import."NALD_ABS_LICENCES" l
  )
  and date_deleted is null
  and regime = 'water'
  and document_type = 'abstraction_licence';
`;
