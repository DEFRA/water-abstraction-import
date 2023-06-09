// provides all API services consumed by VML and VML Admin front ends
require('dotenv').config()

// -------------- Require vendor code -----------------
const Blipp = require('blipp')

const HapiAuthJwt2 = require('hapi-auth-jwt2')
const moment = require('moment')

moment.locale('en-gb')

// -------------- Require project code -----------------
const config = require('./config')
const routes = require('./src/routes.js')
const AirbrakePlugin = require('./src/plugins/airbrake.plugin.js')
const GlobalNotifierPlugin = require('./src/plugins/global-notifier.plugin.js')
const HapiPinoPlugin = require('./src/plugins/hapi-pino.plugin.js')

// Define server
const server = require('./server')

const plugins = [
  {
    plugin: Blipp,
    options: config.blipp
  },
  HapiAuthJwt2,
  require('./src/plugins/pg-boss.plugin'),
  require('./src/modules/licence-import/plugin'),
  require('./src/modules/charging-import/plugin'),
  require('./src/modules/nald-import/plugin'),
  require('./src/modules/bill-runs-import/plugin'),
  require('./src/modules/core/plugin')
]

const configureServerAuthStrategy = (server) => {
  server.auth.strategy('jwt', 'jwt', {
    ...config.jwt,
    validate: async (decoded) => ({ isValid: !!decoded.id })
  })
  server.auth.default('jwt')
}

const start = async function () {
  await server.register(plugins)

  // The order is important here. We need the Hapi pino logger as a base. Then Airbrake needs to be added to the
  // server.app property. Then the GlobalNotifier can be setup as it needs access to both
  await server.register(HapiPinoPlugin())
  await server.register(AirbrakePlugin)
  await server.register(GlobalNotifierPlugin)

  server.validator(require('@hapi/joi'))

  configureServerAuthStrategy(server)

  server.route(routes)

  if (!module.parent) {
    await server.start()
    const name = process.env.SERVICE_NAME
    const uri = server.info.uri
    server.log('info', `Service ${name} running at: ${uri}`)
  }
}

function processError (error) {
  console.error(error)

  process.exit(1)
}

process
  .on('unhandledRejection', (error) => processError(error))
  .on('uncaughtException', (error) => processError(error))
  .on('SIGINT', async () => {
    // The timeout is set to 25 seconds (it has to be passed to Hapi in milliseconds) based on AWS ECS. When it sends a
    // stop request it allows an container 30 seconds before it sends a `SIGKILL`. We know we are not containerised
    // (yet!) but it's a reasonable convention to use
    const options = {
      timeout: 25 * 1000
    }

    // If there are no in-flight requests Hapi will immediately stop. If there are they get 25 seconds to finish
    // before Hapi terminates them
    await server.stop(options)
    await server.messageQueue.stop()

    // Log we're shut down using the same log format as the rest of our log output
    server.logger.info("That's all folks!")

    process.exit(0)
  })

start()

module.exports = server
