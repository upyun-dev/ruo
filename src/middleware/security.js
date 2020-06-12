const {forEachOperation} = require('../utility')

module.exports = (api, middlewares) => {
  const definition = api.definition
  // pre-bind operation to security middleware
  forEachOperation(definition, (path, method, operationDef) => {
    let securitys = operationDef.security || []
    const globalSecurity = definition.security || []
    securitys = securitys.concat(globalSecurity)

    operationDef['securities'] = []
    securitys.map((security) => {
      security = Object.keys(security)[0]
      operationDef['securities'].push(security)
    })
  })

  return (req, res, done) => {
    if (!req.swagger.operation) {
      return done()
    }

    req.securities = req.swagger.operation.definition.securities;
    return middlewares['security']()(req, res, done);
  }
}
