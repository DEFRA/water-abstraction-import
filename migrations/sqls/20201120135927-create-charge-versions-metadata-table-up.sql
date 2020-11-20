CREATE TYPE charge_version_metadata_status AS ENUM('current', 'superseded');

CREATE TABLE water_import.charge_versions_metadata
(
	external_id varchar not null,
	start_date timestamp not null,
	end_date timestamp,
	status charge_version_metadata_status not null,
	is_nald_gap boolean not null
);
