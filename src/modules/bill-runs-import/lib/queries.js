'use strict';

exports.importNaldBillRuns = `
insert into water.billing_batches (
  region_id, batch_type, date_created, date_updated, from_financial_year_ending,
  to_financial_year_ending, status, invoice_count, credit_note_count,
  net_total, bill_run_number, is_summer, source, legacy_id, metadata
)
select r.region_id,
(case 
when nbr."BILL_RUN_TYPE"='A' then 'annual'
when nbr."BILL_RUN_TYPE"='S' then 'supplementary'
when nbr."BILL_RUN_TYPE"='R' then 'two_part_tariff'
end)::water.charge_batch_type as batch_type,
to_date(nbr."INITIATION_DATE", 'DD/MM/YYYY') as date_created,
to_date(nbr."BILL_RUN_STATUS_DATE", 'DD/MM/YYYY') as date_updated,
nbr."FIN_YEAR"::integer as from_financial_year_ending,
nbr."FIN_YEAR"::integer as to_financial_year_ending,
'sent' as status,
nullif(nbr."NO_OF_INVS", 'null')::integer as invoice_count,
nullif(nbr."NO_OF_CRNS", 'null')::integer as credit_note_count,
(
(nullif(nbr."VALUE_OF_INVS", 'null')::numeric * 100) + 
(nullif(nbr."VALUE_OF_CRNS", 'null')::numeric * 100) 
)::bigint as net_total,
nbr."BILL_RUN_NO"::integer as bill_run_number,
false as is_summer,
'nald'::water.billing_batch_source as source,
concat_ws(':', nbr."FGAC_REGION_CODE", nbr."BILL_RUN_NO") as legacy_id,
row_to_json(nbr) as metadata
from import."NALD_BILL_RUNS" nbr
join water.regions r on nbr."FGAC_REGION_CODE"::integer=r.nald_region_id
where 
nbr."BILL_RUN_TYPE" in ('A', 'S', 'R')
and nbr."IAS_XFER_DATE"<>'null'
and nbr."FIN_YEAR"::integer>=2015
on conflict (legacy_id) do nothing;
`;

exports.importNaldBillHeaders = `
insert into water.billing_invoices (
  invoice_account_id, address, invoice_account_number, net_amount,
  is_credit, date_created, date_updated, billing_batch_id, financial_year_ending,
  legacy_id, metadata
)
select 
ia.invoice_account_id,
'{}'::jsonb as address,
nbh."IAS_CUST_REF" as invoice_account_number,
nbh."BILLED_AMOUNT"::numeric as net_amount,
nbh."BILL_TYPE"='C' as is_credit,
b.date_created,
b.date_updated,
b.billing_batch_id,
nbh."FIN_YEAR"::integer as financial_year_ending,
concat_ws(':', nbh."FGAC_REGION_CODE", nbh."ID") as legacy_id,
row_to_json(nbh) as metadata
from import."NALD_BILL_HEADERS" nbh
left join crm_v2.invoice_accounts ia on nbh."IAS_CUST_REF"=ia.invoice_account_number
join water.billing_batches b on b.legacy_id=concat_ws(':', nbh."FGAC_REGION_CODE", nbh."ABRN_BILL_RUN_NO")
on conflict (legacy_id) do nothing;
`;
