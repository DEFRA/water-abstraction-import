const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const sandbox = require('sinon').createSandbox();
const { expect, fail } = require('code');
const importDocumentBillingRoles = require('../../../../src/modules/crm/lib/import-document-billing-roles');
const { logger } = require('../../../../src/logger');
const queries = require('../../../../src/modules/crm/lib/queries');
const { pool } = require('../../../../src/lib/connectors/db');

const defaults = {
    document_id: 'document_1',
    company_id: 'company_1',
    invoice_account_id: 'invoice_account_1',
    start_date: '2018-01-01',
    end_date: '2019-01-01',
    cv_start_date: '2017-08-05',
    cv_end_date: null,
    role_id: 'billing_role'
}

const createRow = (data = {}) => Object.assign({}, defaults, data);

experiment('modules/crm/lib/import-document-billing-roles', () => {
    
    beforeEach(async() => {
        sandbox.stub(pool, 'query');  
        sandbox.stub(logger, 'error');
    });

    afterEach(async() => {
        sandbox.restore();
    });

    experiment('importDocumentBillingRoles', async() => {
        let result;

        beforeEach(async() => {
           pool.query.withArgs(queries.documents.getDocumentChargeVersions)
            .resolves({
                rows: [
                    createRow({ start_date : '2018-01-01', cv_start_date :  '2017-08-01'})   
                ]
            })
           result = await importDocumentBillingRoles.importDocumentBillingRoles();
        });

        test('uses the correct query to load document roles from the database', async() => {
            expect(pool.query.firstCall.calledWith(
                queries.documents.getDocumentChargeVersions
            )).to.be.true();
        });

        test('inserts the mapped data with the correct query', async() => {
            const [ query ] = pool.query.lastCall.args;
            expect(query).to.equal(queries.documentRoles.insertBillingRole);
        });

        test('inserts the mapped data with the correct params', async() => {
            const [ , params ] = pool.query.lastCall.args;
            expect(params).to.equal([ 
                'document_1',
                'company_1',
                'invoice_account_1',
                'billing_role',
                '2018-01-01',
                null 
            ]);
        });
    })

    experiment('_mapBillingRole', () => {
        experiment('when the charge version starts before the document', async() => {
            let data, result;

            beforeEach(async() => {
                data = [
                    createRow({ start_date : '2018-01-01', cv_start_date :  '2017-08-01'})
                ];
                result = importDocumentBillingRoles._mapBillingRoles(data);
            });

            test('1 document role is created', async() => {
                expect(result.length).to.equal(1);
            });

            test('the start date is document start date', async() => {
                expect(result[0].startDate).to.equal('2018-01-01');
            });

            test('the end date is the charge version end date null', async() => {
                expect(result[0].endDate).to.equal(null);
            });
        });

        experiment('when the charge version starts after the document', async() => {
            let data, result;

            beforeEach(async() => {
                data = [
                    createRow({ start_date : '2018-01-01', cv_start_date :  '2018-02-01'})
                ];
                result = importDocumentBillingRoles._mapBillingRoles(data);
            });

            test('1 document role is created', async() => {
                expect(result.length).to.equal(1);
            });

            test('the start date is charge version start date', async() => {
                expect(result[0].startDate).to.equal('2018-02-01');
            });

        });

        experiment('when there are 2 charge versions for the same invoice account', () => {
            let data, result;

            beforeEach(async() => {
                data = [
                    createRow({ start_date : '2018-01-01', cv_start_date :  '2017-08-01', cv_end_date : '2018-06-01'}),
                    createRow({ start_date : '2018-01-01', cv_start_date :  '2018-06-02'})
                ];
                result = importDocumentBillingRoles._mapBillingRoles(data);
            });

            test('1 document role is created', async() => {
                expect(result.length).to.equal(1);
            });

            test('the start date is document start date', async() => {
                expect(result[0].startDate).to.equal('2018-01-01');
            });

            test('the end date is the second charge version end date', async() => {
                expect(result[0].endDate).to.equal(null);
            });
        });


    
        experiment('when there are several charge versions for the different invoice accounts', () => {
            let data, result;

            beforeEach(async() => {
                data = [
                    createRow({ start_date : '2018-01-01', cv_start_date :  '2017-08-01', cv_end_date : '2018-06-01'}),
                    createRow({ invoice_account_id : 'invoice_account_2', start_date : '2018-01-01', cv_start_date :  '2018-06-02'})
                ];
                result = importDocumentBillingRoles._mapBillingRoles(data);
            });

            test('2 document roles are created', async() => {
                expect(result.length).to.equal(2);
            });

            test('the first role is for the first invoice account', async() => {
                expect(result[0].invoiceAccountId).to.equal('invoice_account_1');
            });

            test('the first role start date is document start date', async() => {
                expect(result[0].startDate).to.equal('2018-01-01');
            });

            test('the first role end date is the charge version end date', async() => {
                expect(result[0].endDate).to.equal('2018-06-01');
            });

            test('the second role is for the second invoice account', async() => {
                expect(result[1].invoiceAccountId).to.equal('invoice_account_2');
            });

            test('the second role start date is the second charge version start date', async() => {
                expect(result[1].startDate).to.equal('2018-06-02');
            });

            test('the second role end date is the second charge version end date', async() => {
                expect(result[1].endDate).to.equal(null);
            });
        });
    });
});