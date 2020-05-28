// provides all API services consumed by VML and VML Admin front ends
require('dotenv').config();

const Hapi = require('@hapi/hapi');

/**
 * Temporary implementation here whilst redis is provisioned. When
 * swapped to Redis the catbox redis module can be uninstalled
 * npm uninstall @hapi/catbox-memory
 */
const CatboxMemory = require('@hapi/catbox-memory');
// const CatboxRedis = require('@hapi/catbox-redis');

const config = require('./config');

// Define server
const server = Hapi.server({
  ...config.server,
  cache: [
    /**
     * Temporary implementation here whilst redis is provisioned. When
     * swapped to Redis the catbox redis module can be uninstalled
     * npm uninstall @hapi/catbox-memory
     */
    {
      provider: {
        constructor: CatboxMemory,
        options: {
          maxByteSize: 10485760
        }
      }
    }
    // {
    //   provider: {
    //     constructor: CatboxRedis,
    //     options: config.redis
    //   }
    // }
  ]
});

module.exports = server;
