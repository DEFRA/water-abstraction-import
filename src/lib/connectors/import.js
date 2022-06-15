'use strict';

const { pool } = require('./db');

const getLicenceNumbersQuery = `
  select "LIC_NO"
  from import."NALD_ABS_LICENCES";
`;

const deleteCrmV1DocumentsQuery = `
  update crm.document_header
  set date_deleted = now()
  where system_external_id not in (
    select l."LIC_NO"
    from import."NALD_ABS_LICENCES" l
  )
  and date_deleted is null
  and regime_entity_id = '0434dc31-a34e-7158-5775-4694af7a60cf';
`;

const getLicenceNumbers = async () => {
  const response = await pool.query(getLicenceNumbersQuery);
  return response.rows || [];
};

const deleteRemovedDocuments = () => {
  return pool.query(deleteCrmV1DocumentsQuery);
};

module.exports = {
  getLicenceNumbers,
  deleteRemovedDocuments
};
