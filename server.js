'use strict'

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const Basic = require('hapi-auth-basic')
const Boom = require('boom')
const Hapi = require('hapi')
const Vision = require('vision')
const analyticsRequest = require('request')

const port = process.env.PORT
const server = new Hapi.Server()

server.connection({port})

server.register([Basic, Vision], err => {
  if (err) throw err

  server.auth.strategy('simple', 'basic', {
    validateFunc: (request, user, pass, cb) => {
      if (!user || !pass) return cb(null, false)
      if (user !== process.env.AUTH_USER) return cb(null, false)
      if (pass === process.env.AUTH_PASS) {
        return cb(null, true, {})
      } else {
        return cb(null, false)
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: 'simple',
      handler: (request, reply) => {
          reply('hello world');
      }
    }
  })

  server.route({
    method: 'POST',
    path: '/',
    handler: (request, reply) => {
      if (request.payload && request.payload.prod === 'Electron') {

        var analyticsJSON = {};
        analyticsJSON.version = request.payload.version;
        analyticsJSON.host = request.payload.host;
        analyticsJSON.short_message = request.payload.short_message;
        analyticsJSON._userID = request.payload._userID;
        analyticsJSON._platform = request.payload._platform;
        analyticsJSON._appVersion = request.payload._appVersion;
        analyticsJSON._env = parseInt(request.payload._env);
        analyticsJSON._guid = request.payload.guid;
        analyticsJSON._prod = request.payload.prod;
        analyticsJSON._electronVersion = request.payload.ver;
        analyticsJSON._processType = request.payload.process_type;
        analyticsJSON._nodeVersion = request.payload._nodeVersion;
        analyticsJSON._session = request.payload._session;
        analyticsJSON.ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;

        const payload = Object.assign({}, analyticsJSON)

        reply()

        analyticsRequest.post({
            url: 'https://metrics.phonegap.com/gelfproxypass',
            method: 'POST',
            form: JSON.stringify(payload)
        }, function(err, res, body) {
            if (err) {
                console.log('*** post error: ' + err);
            } else {
                console.log('*** post success: ' + body);
            }
        });

      } else {
        const error = Boom.badRequest()

        reply(error)
      }
    }
  })

  server.start(err => {
    if (err) throw err

    console.log(`Server running at: ${server.info.uri}`)
  })
})
