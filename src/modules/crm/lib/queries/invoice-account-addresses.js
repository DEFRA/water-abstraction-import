exports.insertInvoiceAccountAddress = `
  INSERT INTO crm_v2.invoice_account_addresses
    (invoice_account_id, address_id, start_date, end_date, date_created, date_updated)
  VALUES
    ($1, $2, $3, $4, NOW(), NOW())
  ON CONFLICT (invoice_account_id, start_date) DO UPDATE SET
    end_date=EXCLUDED.end_date,
    date_updated=EXCLUDED.date_updated`;
