'use strict'

module.exports = async function site (req, services) {
  return { site: services.conf.site }
}
