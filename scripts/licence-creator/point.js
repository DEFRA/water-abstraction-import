'use strict';

const common = require('./common');

const gridRef = (index, sheet = null, east = null, north = null, cartEast = null, cartNorth = null) => ({
  [`NGR${index}_SHEET`]: sheet,
  [`NGR${index}_EAST`]: east,
  [`NGR${index}_NORTH`]: north,
  [`CART${index}_EAST`]: cartEast,
  [`CART${index}_NORTH`]: cartNorth
});

const getHydro = () => common.createNullKeys('HYDRO_REF', 'HYDRO_INTERCEPT_DIST', 'HYDRO_GW_OFFSET_DIST');

const getNextId = require('./next-id.js');

class Point {
  constructor () {
    this.id = getNextId();
    this.source = null;
  }

  setSource (source) {
    this.source = source;
  }

  export () {
    return {
      ID: this.id,
      ...gridRef(1, 'SP', 123, 456, 400000, 240000),
      ...gridRef(2),
      ...gridRef(3),
      ...gridRef(4),
      LOCAL_NAME: 'TEST BOREHOLE',
      ASRC_CODE: this.source.code,
      DISABLED: 'N',
      AAPC_CODE: 'SP',
      AAPT_APTP_CODE: 'G',
      AAPT_APTS_CODE: 'BH',
      ...common.createNullKeys('LOCAL_NAME_WELSH', 'ABAN_CODE', 'LOCATION_TEXT', 'AADD_ID', 'DEPTH'),
      ...common.createNullKeys('WRB_NO', 'BGS_NO', 'REG_WELL_INDEX_REF', 'NOTES'),
      ...getHydro(),
      ...common.getCommonObject('FGAC_REGION_CODE', 'SOURCE_CODE', 'BATCH_RUN_DATE')
    };
  }
}

module.exports = Point;
