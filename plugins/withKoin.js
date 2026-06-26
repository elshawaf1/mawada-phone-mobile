const { withAppBuildGradle } = require('expo/config-plugins')

module.exports = function withKoin(config) {
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('io.insert-koin')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*\{/,
        "dependencies {\n    implementation 'io.insert-koin:koin-android:3.4.0'\n    implementation 'io.insert-koin:koin-core:3.4.0'"
      )
    }
    return config
  })
  return config
}
