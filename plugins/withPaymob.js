const { withAppBuildGradle } = require('expo/config-plugins')

module.exports = function withPaymob(config) {
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('dataBinding')) {
      config.modResults.contents = config.modResults.contents.replace(
        /buildFeatures\s*\{/,
        "buildFeatures {\n        dataBinding true"
      )
    }
    return config
  })
  return config
}
