const rc = require('../rc')

const debug = require('debug')(rc.name)

const {names, HttpError} = require('../error')

module.exports = {
  response () {
    return (req, res, obj) => {
      if (req.swagger.operation) {
        const error = req.swagger.operation.validateResponse(req, res, obj)

        if (error && rc.env !== 'production') {
          debug('original response', obj)
          throw new HttpError(names[500], 'InvalidResponse ' + JSON.stringify(error, null, '  '))
        }
      }
      return obj
    }
  },

  request () {
    return (req, res, next) => {
      if (req.swagger.operation) {
        const validateResult = req.swagger.operation.validateRequest(req)
        if (validateResult.errors.length) {
          // TODO: return multiple errors
          const error = validateResult.errors[0]
          const field = error.name
          const reason = error.errors ? error.errors[0].message : error.message
          const message = `Invalid parameter (${field}): ${reason}`
          const err = new HttpError(names[400], message)
          err.field = field
          return next(err)
        }
      }
      next()
    }
  }
}
