'use strict'

const { experiment, it } = module.exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')

const {
  getVersionFilter,
  getEventFilter,
  getPagination
} = require('../../../../src/modules/returns/lib/api-helpers')

experiment('getVersionFilter', () => {
  it('Should get version filter with no end date specified', async () => {
    const request = {
      query: {
        start: '2018-04-01'
      }
    }

    const data = getVersionFilter(request)

    expect(data).to.equal({ current: true, created_at: { $gte: '2018-04-01' } })
  })

  it('Should get version filter with end date specified', async () => {
    const request = {
      query: {
        start: '2018-04-01',
        end: '2018-05-12'
      }
    }

    const filter = getVersionFilter(request)

    expect(filter).to.equal({ current: true, created_at: { $gte: '2018-04-01', $lte: '2018-05-12' } })
  })
})

experiment('getEventFilter', () => {
  it('Should get event filter with no end date specified', async () => {
    const request = {
      query: {
        start: '2018-04-01'
      }
    }

    const filter = getEventFilter(request)
    expect(filter).to.equal({ created: { $gte: '2018-04-01' }, type: 'return.status' })
  })

  it('Should get event filter with end date specified', async () => {
    const request = {
      query: {
        start: '2018-04-01',
        end: '2018-06-01'
      }
    }

    const filter = getEventFilter(request)
    expect(filter).to.equal({ created: { $gte: '2018-04-01', $lte: '2018-06-01' }, type: 'return.status' })
  })
})

experiment('getPagination', () => {
  it('Should get default pagination', async () => {
    const request = {
      query: {
        pagination: {}
      }
    }

    const pagination = getPagination(request)

    expect(pagination).to.equal({
      page: 1,
      perPage: 2000
    })
  })

  it('Should be able to set page', async () => {
    const request = {
      query: {
        pagination: { page: 2 }
      }
    }

    const pagination = getPagination(request)

    expect(pagination).to.equal({
      page: 2,
      perPage: 2000
    })
  })

  it('Should be able to set page and row count per page', async () => {
    const request = {
      query: {
        pagination: { page: 3, perPage: 200 }
      }
    }

    const pagination = getPagination(request)

    expect(pagination).to.equal({
      page: 3,
      perPage: 200
    })
  })
})
