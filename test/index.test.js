'use strict'

// Test framework dependencies
const { experiment, test } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')

// Thing under test
const server = require('../index')

experiment('index.js', () => {
  experiment('pg-boss plugin', () => {
    test.only('is registered', async () => {
      expect(server.messageQueue).to.exist()
    })
  })
})
