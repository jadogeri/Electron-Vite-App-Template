const { validateSigning } = require('./scripts/signing/validate.cjs')
validateSigning(process.platform, process.env)
module.exports = {
  extends: null,
  ...require('./package.json').build,
  forceCodeSigning: true,
  publish: null,
  mac: {
    ...require('./package.json').build.mac,
    hardenedRuntime: true,
    entitlements: 'resources/entitlements.mac.plist',
    entitlementsInherit: 'resources/entitlements.mac.plist',
    notarize: true
  },
  win: {
    ...require('./package.json').build.win,
    signAndEditExecutable: true,
    signingHashAlgorithms: ['sha256'],
    rfc3161TimeStampServer: 'http://timestamp.digicert.com'
  }
}
