CREATE TYPE charge_version_metadata_status AS ENUM('current', 'superseded');

CREATE TABLE water_import.charge_versions_metadata
(
	external_id varchar not null,
	start_date date not null,
	end_date date,
	status charge_version_metadata_status not null,
	is_nald_gap boolean not null,
	date_created timestamp with time zone NOT NULL DEFAULT NOW(),
    date_updated timestamp with time zone
);
