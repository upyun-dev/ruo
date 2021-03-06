const http = require('http')

const express = require('express')
const Router = require('router')

const rc = require('./rc')
const utility = require('./utility')
const Pipeline = require('./pipeline')
const mws = require('./middleware')
const load = require('./load')
const {HttpError, ParameterError} = require('./error')
const createWebSocketApplication = require('./ws')
const createSession = require('./session')
const createTestApplicationAsync = require('./supertest')

exports.createApplicationAsync = createApplicationAsync
// backward compability
exports.ResponseError = exports.HttpError = HttpError
exports.ParameterError = ParameterError
exports.translate = exports.utility = utility
exports.rc = rc
exports.wrapRoute = utility.wrapRoute
exports.wrapMiddleware = utility.wrapMiddleware
exports.getRestMiddleware = getRestMiddleware

async function createApplicationAsync (app, config = {}) {
  try {
    if (!app) {
      app = express()
      config = require('./config')
      exports.config = config
    }
    exports.app = app

    let server;

    if (config.finalhandler) {
      server = http.createServer((req, res) => {
        app(req, res, config.finalhandler)
      })
    } else {
      server = http.createServer(app)
    }
    const {api, middlewares} = await load(config.swagger, exports)
    exports.api = api

    exports.createTestApplicationAsync = () => createTestApplicationAsync(app, api, config)
    exports.getRestMiddleware = exports.restMiddleware = () => getRestMiddleware({api, middlewares, errorHandler: config.errorHandler})

    if (config.session) {
      app.use(createSession(config.session))
    }

    if (config.ws) {
      const wsapp = createWebSocketApplication(server, api, config.ws)
      app.wsapp = wsapp
      exports.wsapp = wsapp
      app.use(wsapp.extendMiddleware)
      // TODO: find a better way to mount handle in the end
      setImmediate(() => {
        wsapp.use(exports.getRestMiddleware())
      })
    }

    app.listen = function listen () {
      return server.listen.apply(server, arguments)
    }

    return app
  } catch (err) {
    console.log(err.stack) // eslint-disable-line
    process.exit(1)
  }
}

function getRestMiddleware ({api, middlewares, swagger, errorHandler} = {}) {
  const router = Router()

  if (!api || !middlewares) {
    load(swagger)
      .then(({api, middlewares}) => {
        router.use(getRestMiddleware({api, middlewares, errorHandler}))
      }).catch((err) => {
        console.log(err.stack) // eslint-disable-line
        process.exit(1)
      })
    return router
  }

  //
  // Response pipeline
  //

  const pipeline = Pipeline()
  pipeline.use(mws.debug.postHandler())
  // remove response `null` fields
  pipeline.use(mws.validation.response())
  pipeline.use(mws.debug.response())
  router.use(pipeline.createMiddleware())

  //
  // Request pipeline
  //

  router.use((req, res, next) => {
    req.state = {
      version: api.definition.info.version
    }
    const operation = api.getOperation(req)
    req.swagger = {
      operation: operation
    }
    next()
  })
  // binding request context
  router.use(mws.context(rc.target + '/context'))
  router.use(mws.switch())
  // request & response logging
  router.use(mws.debug.request())
  // request validation
  router.use(mws.validation.request())
  // security handler
  router.use(mws.security(api, middlewares))
  // dynamic swagger defined route
  router.use(mws.debug.preHandler())
  router.use(api.basePathPrefix, mws.api(api))

  // 404
  router.use(api.basePathPrefix, () => {
    throw new HttpError('NotFound')
  })

  // error handling
  router.use(api.basePathPrefix, mws.errorHandler(api, errorHandler))

  return router
}

process.on('unhandledRejection', function (reason, p) {
  console.error('Unhandled Rejection at: Promise ', p, ' reason: ', reason)
  console.error(reason.message, reason.stack)
  throw reason
})
