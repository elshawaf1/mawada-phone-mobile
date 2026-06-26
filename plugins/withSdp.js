const { withAppBuildGradle } = require('expo/config-plugins')

module.exports = function withSdp(config) {
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('intuit.sdp')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {
    implementation 'com.intuit.sdp:sdp-android:1.1.1'
    implementation 'com.intuit.ssp:ssp-android:1.1.1'
    implementation 'com.hbb20:ccp:2.7.3'
    implementation 'androidx.navigation:navigation-fragment-ktx:2.9.3'
    implementation 'androidx.navigation:navigation-ui-ktx:2.9.3'`
      )
    }
    return config
  })
  return config
}
