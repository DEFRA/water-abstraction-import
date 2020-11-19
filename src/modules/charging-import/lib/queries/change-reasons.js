'use strict';

const getNALDGapChangeReason = `
select * from water.change_reasons where description='NALD gap';
`;

exports.getNALDGapChangeReason = getNALDGapChangeReason;
