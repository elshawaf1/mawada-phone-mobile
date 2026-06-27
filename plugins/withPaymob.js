const { withAppBuildGradle, withProjectBuildGradle, withAndroidManifest } = require('expo/config-plugins')

module.exports = function withPaymob(config) {
  // 1. Add local Maven repo for Paymob SDK AAR to project-level build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('paymob-reactnative')) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*\{/,
        `allprojects {
    repositories {
        maven {
            url = rootProject.projectDir.toURI().resolve("../node_modules/paymob-reactnative/android/libs")
        }
    }`
      )
    }
    return config
  })

  // 2. Enable dataBinding in app-level build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('dataBinding')) {
      // Try existing buildFeatures block first
      if (config.modResults.contents.includes('buildFeatures')) {
        config.modResults.contents = config.modResults.contents.replace(
          /buildFeatures\s*\{/,
          "buildFeatures {\n        dataBinding true"
        )
      } else {
        // No buildFeatures block exists — add it inside the android block
        config.modResults.contents = config.modResults.contents.replace(
          /android\s*\{/,
          `android {
    buildFeatures {
        dataBinding true
    }`
        )
      }
    }
    return config
  })

  // 3. Fix manifest merger conflict: Paymob SDK sets enableOnBackInvokedCallback=true
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest
    if (manifest.$) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools'
    }
    const application = manifest.application?.[0]
    if (application?.$) {
      if (!application.$['tools:replace']) {
        application.$['tools:replace'] = 'android:enableOnBackInvokedCallback'
      }
      application.$['android:enableOnBackInvokedCallback'] = 'false'
    }
    return config
  })

  return config
}
