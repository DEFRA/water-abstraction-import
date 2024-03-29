const { test, experiment, beforeEach } = exports.lab = require('@hapi/lab').script()
const { transformLicence } = require('../../../../src/modules/licence-import/transform/licence')
const { expect } = require('@hapi/code')

const data = require('./data')
const createSimpleLicence = () => {
  const licence = data.createLicence()
  const purpose = data.createPurpose(licence)

  return {
    licence,
    versions: [
      data.createVersion(licence)
    ],
    chargeVersions: [
      data.createChargeVersion(licence)
    ],
    tptAgreements: [

    ],
    section130Agreements: [

    ],
    parties: [
      data.createParty()
    ],
    addresses: [
      data.createAddress()
    ],
    purposes: [
      purpose
    ],
    conditions: [
      data.createCondition(purpose)
    ],
    roles: []
  }
}

const createComplexLicence = () => {
  const licence = data.createLicence()
  const purpose1 = data.createPurpose(licence, { AABV_ISSUE_NO: '1', AABV_INCR_NO: '1', APUR_APPR_CODE: 'A' })
  const purpose2 = data.createPurpose(licence, { AABV_ISSUE_NO: '1', AABV_INCR_NO: '2', APUR_APPR_CODE: 'B' })
  return {
    licence,
    versions: [
      data.createVersion(licence, { ISSUE_NO: '1', INCR_NO: '1', EFF_ST_DATE: '02/04/2015', EFF_END_DATE: '05/07/2015' }),
      data.createVersion(licence, { ISSUE_NO: '1', INCR_NO: '2', EFF_ST_DATE: '06/07/2015', EFF_END_DATE: '12/08/2015' }),
      data.createVersion(licence, { ISSUE_NO: '2', INCR_NO: '1', EFF_ST_DATE: '13/08/2015', EFF_END_DATE: 'null' })
    ],
    purposes: [
      purpose1,
      purpose2,
      data.createPurpose(licence, { AABV_ISSUE_NO: '2', AABV_INCR_NO: '1', APUR_APPR_CODE: 'C' }),
      data.createPurpose(licence, { AABV_ISSUE_NO: '2', AABV_INCR_NO: '1', APUR_APPR_CODE: 'D' })
    ],
    conditions: [
      data.createCondition(purpose1, { TEXT: 'null' }),
      data.createCondition(purpose2, { ACIN_CODE: 'ABC', ACIN_SUBCODE: 'XYZ', PARAM1: 'param 1 text', PARAM2: 'param 2 text', TEXT: 'more plain test text' })
    ],
    chargeVersions: [
      data.createChargeVersion(licence, { VERS_NO: '1', EFF_ST_DATE: '02/04/2015', EFF_END_DATE: '14/05/2016', ACON_APAR_ID: '1000' }),
      data.createChargeVersion(licence, { VERS_NO: '2', EFF_ST_DATE: '15/05/2016', ACON_APAR_ID: '1001', IAS_CUST_REF: 'Y7890' })
    ],
    tptAgreements: [
      { AFSA_CODE: 'S127', EFF_ST_DATE: '02/04/2015', EFF_END_DATE: '05/07/2015', version_number: 1 },
      { AFSA_CODE: 'S127', EFF_ST_DATE: '06/07/2015', EFF_END_DATE: '12/08/2015', version_number: 2 },
      { AFSA_CODE: 'S127', EFF_ST_DATE: '01/07/2017', EFF_END_DATE: 'null', version_number: 3 }
    ],
    section130Agreements: [
      { AFSA_CODE: 'S130', EFF_ST_DATE: '02/04/2015', EFF_END_DATE: '05/07/2015' }
    ],
    parties: [
      data.createCompany(),
      data.createPerson()
    ],
    addresses: [
      data.createAddress()
    ],
    roles: [
      { ALRT_CODE: 'RT', EFF_ST_DATE: '09/04/2015', EFF_END_DATE: '12/08/2015', ACON_APAR_ID: '1001', ACON_AADD_ID: '1000', FGAC_REGION_CODE: '1' },
      { ALRT_CODE: 'FM', EFF_ST_DATE: '09/04/2015', EFF_END_DATE: '12/08/2015', ACON_APAR_ID: '1001', ACON_AADD_ID: '1000', FGAC_REGION_CODE: '1' }
    ]
  }
}

experiment('modules/licence-import/transform/licence.js', () => {
  let result

  experiment('transformLicence', () => {
    experiment('for a simple licence', () => {
      beforeEach(async () => {
        const licenceData = createSimpleLicence()
        result = transformLicence(licenceData)
      })

      test('the licence should contain licence details', async () => {
        expect(result.licenceNumber).to.equal('01/123')
        expect(result.startDate).to.equal('2016-04-01')
        expect(result.externalId).to.equal('1:123')
        expect(result.endDate).to.equal(null)
      })

      test('a document is created for the licence', async () => {
        const { document } = result
        expect(document).to.be.an.object()
        expect(document.documentRef).to.equal('01/123')
        expect(document.startDate).to.equal('2016-04-01')
        expect(document.endDate).to.equal(null)
        expect(document.externalId).to.equal('1:123')
        expect(document.roles).to.be.an.array()
      })

      test('a document role is created for the licence holder', async () => {
        const [role] = result.document.roles
        expect(role.role).to.equal('licenceHolder')
        expect(role.startDate).to.equal('2016-04-01')
        expect(role.endDate).to.equal(null)
        expect(role.company.externalId).to.equal('1:1000')
        expect(role.contact).to.equal(null)
        expect(role.address.externalId).to.equal('1:1000')
      })

      test('1 role is created', async () => {
        expect(result.document.roles.length).to.equal(1)
      })

      test('there are no document roles for returns', async () => {
        expect(result.document.roles.map(role => role.role)).to.only.include(['licenceHolder'])
      })

      test('there are no licence agreements', async () => {
        expect(result.agreements).to.equal([])
      })

      test('the licence contains versions data', async () => {
        expect(result.versions.length).to.equal(1)
        expect(result.versions[0].increment).to.equal(1)
        expect(result.versions[0].status).to.equal('current')
      })

      test('the licence contains purpose conditions data', async () => {
        const condition = result.versions[0].purposes[0].conditions[0]
        expect(result.versions[0].purposes[0].conditions.length).to.equal(1)
        expect(condition.code).to.equal('AAG')
        expect(condition.subcode).to.equal('LLL')
        expect(condition.param1).to.equal(null)
        expect(condition.param2).to.equal(null)
        expect(condition.notes).to.equal('The howling wolf watering hole')
      })
    })

    experiment('for a licence with many versions', () => {
      beforeEach(async () => {
        const licenceData = createComplexLicence()
        result = transformLicence(licenceData)
      })

      test('a single document is created for the licence', async () => {
        const { document } = result
        expect(document).to.be.an.object()
        expect(result.document.startDate).to.equal('2016-04-01')
        expect(result.document.endDate).to.be.null()
      })

      test('the document has 4 roles', async () => {
        expect(result.document.roles.length).to.equal(4)
      })

      test('the first licence version is mapped to a licence holder role with dates constrained by the licence start date', async () => {
        const [role] = result.document.roles
        expect(role.role).to.equal('licenceHolder')
        expect(role.startDate).to.equal('2016-04-01')
        expect(role.endDate).to.equal('2015-07-05')
        expect(role.company.externalId).to.equal('1:1000')
        expect(role.contact).to.equal(null)
        expect(role.address.externalId).to.equal('1:1000')
      })

      test('the second licence version is mapped to a licence holder role with dates constrained by the licence start date', async () => {
        const [, role] = result.document.roles
        expect(role.role).to.equal('licenceHolder')
        expect(role.startDate).to.equal('2016-04-01')
        expect(role.endDate).to.equal('2015-08-12')
        expect(role.company.externalId).to.equal('1:1000')
        expect(role.contact).to.equal(null)
        expect(role.address.externalId).to.equal('1:1000')
      })

      test('the third licence version is mapped to a licence holder role with dates constrained by the licence start date', async () => {
        const [,, role] = result.document.roles
        expect(role.role).to.equal('licenceHolder')
        expect(role.startDate).to.equal('2016-04-01')
        expect(role.endDate).to.be.null()
        expect(role.company.externalId).to.equal('1:1000')
        expect(role.contact).to.equal(null)
        expect(role.address.externalId).to.equal('1:1000')
      })

      test('the document has the correct returns to role', async () => {
        const [,,, role] = result.document.roles
        expect(role.role).to.equal('returnsTo')
        expect(role.startDate).to.equal('2015-04-09')
        expect(role.endDate).to.equal('2015-08-12')
      })

      test('the two part tariff agreements are merged where date ranges are adjacent', async () => {
        expect(result.agreements[0].agreementCode).to.equal('S127')
        expect(result.agreements[0].startDate).to.equal('2015-04-02')
        expect(result.agreements[0].endDate).to.equal('2015-08-12')

        expect(result.agreements[1].agreementCode).to.equal('S127')
        expect(result.agreements[1].startDate).to.equal('2017-07-01')
        expect(result.agreements[1].endDate).to.equal(null)
      })

      test('the S130 agreement is added', async () => {
        expect(result.agreements[2].agreementCode).to.equal('S130')
        expect(result.agreements[2].startDate).to.equal('2015-04-02')
        expect(result.agreements[2].endDate).to.equal('2015-07-05')
      })

      test('the versions contain the purposes', async () => {
        expect(result.versions[0].purposes.length).to.equal(1)
        expect(result.versions[1].purposes.length).to.equal(1)
        expect(result.versions[2].purposes.length).to.equal(2)

        expect(result.versions[0].purposes[0].purposePrimary).to.equal('A')
        expect(result.versions[1].purposes[0].purposePrimary).to.equal('B')
        expect(result.versions[2].purposes[0].purposePrimary).to.equal('C')
        expect(result.versions[2].purposes[1].purposePrimary).to.equal('D')
      })

      test('the licence contains the correct purpose conditions data', async () => {
        const condition1 = result.versions[1].purposes[0].conditions[0]
        const condition2 = result.versions[1].purposes[0].conditions[1]
        expect(result.versions[1].purposes[0].conditions.length).to.equal(2)
        expect(condition1.code).to.equal('AAG')
        expect(condition1.subcode).to.equal('LLL')
        expect(condition1.param1).to.equal(null)
        expect(condition1.param2).to.equal(null)
        expect(condition1.notes).to.equal(null)

        expect(condition2.code).to.equal('ABC')
        expect(condition2.subcode).to.equal('XYZ')
        expect(condition2.param1).to.equal('param 1 text')
        expect(condition2.param2).to.equal('param 2 text')
        expect(condition2.notes).to.equal('more plain test text')
      })
    })

    experiment('isWaterUndertaker', () => {
      test('is set to false when the AREP_EIUC_CODE does not end with "SWC"', async () => {
        const rawData = createSimpleLicence()
        const transformed = transformLicence(rawData)
        expect(transformed.isWaterUndertaker).to.be.false()
      })
    })
  })
})
