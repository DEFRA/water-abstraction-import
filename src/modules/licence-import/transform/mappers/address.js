const str = require('./str')
const { createRegionSkeleton } = require('./region-skeleton')

const mapAddress = address => ({
  address1: str.mapNull(address.ADDR_LINE1),
  address2: str.mapNull(address.ADDR_LINE2),
  address3: str.mapNull(address.ADDR_LINE3),
  address4: str.mapNull(address.ADDR_LINE4),
  town: str.mapNull(address.TOWN),
  county: str.mapNull(address.COUNTY),
  postcode: str.mapNull(address.POSTCODE),
  country: str.mapNull(address.COUNTRY),
  externalId: `${address.FGAC_REGION_CODE}:${address.ID}`,
  _nald: address
})

const mapAddresses = addresses => addresses.reduce((acc, address) => {
  // (object, path, value)
  const set = (obj, path, value) => {
    // Regex explained: https://regexr.com/58j0k
    const pathArray = Array.isArray(path) ? path : path.match(/([^[.\]])+/g)

    pathArray.reduce((acc, key, i) => {
      if (acc[key] === undefined) acc[key] = {}
      if (i === pathArray.length - 1) acc[key] = value

      return acc[key]
    }, obj)
  }
  set(acc, `${address.FGAC_REGION_CODE}.${address.ID}`, mapAddress(address))
  return acc
}, createRegionSkeleton())

module.exports = {
  mapAddress,
  mapAddresses
}
