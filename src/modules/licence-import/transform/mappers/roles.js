'use strict';

const ROLE_LICENCE_HOLDER = 'licenceHolder';
const ROLE_BILLING = 'billing';
const ROLE_RETURNS_TO = 'returnsTo';

/**
 * Maps the NALD role codes to the CRM v2 role name
 * @type {Map}
 */
const naldRoles = new Map();
naldRoles.set('RT', ROLE_RETURNS_TO);

exports.ROLE_LICENCE_HOLDER = ROLE_LICENCE_HOLDER;
exports.ROLE_BILLING = ROLE_BILLING;
exports.ROLE_RETURNS_TO = ROLE_RETURNS_TO;

exports.naldRoles = naldRoles;
