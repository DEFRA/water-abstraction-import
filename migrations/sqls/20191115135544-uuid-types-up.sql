/* Replace with your SQL commands */
ALTER TABLE water_import.charge_agreements
ALTER COLUMN charge_agreement_id TYPE uuid USING charge_agreement_id::uuid;

ALTER TABLE water_import.charge_elements
ALTER COLUMN charge_element_id TYPE uuid USING charge_element_id::uuid;

ALTER TABLE water_import.charge_versions
ALTER COLUMN charge_version_id TYPE uuid USING charge_version_id::uuid;