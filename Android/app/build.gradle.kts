plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}
android {
    namespace = "lv.turiba.next"
    compileSdk = 37
    defaultConfig {
        applicationId = "lv.turiba.next"
        minSdk = 29
        targetSdk = 37
        versionCode = providers.gradleProperty("releaseVersionCode").orElse("2").get().toInt()
        versionName = providers.gradleProperty("releaseVersionName").orElse("0.1.0-rc.2").get()
        testInstrumentationRunner = "lv.turiba.next.OfflineTestRunner"
    }
    buildFeatures { compose = true }
    bundle { language { enableSplit = false } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    buildTypes {
        release { isMinifyEnabled = false }
    }
    lint { abortOnError = true }
    testOptions { unitTests.isReturnDefaultValues = true }
    sourceSets["androidTest"].assets.directories.add(rootProject.file("../tests/fixtures").absolutePath)
    sourceSets["androidTest"].assets.directories.add(file("schemas").absolutePath)
    sourceSets["androidTest"].assets.directories.add(rootProject.file("core/src/test/resources").absolutePath)
}
ksp { arg("room.schemaLocation", "$projectDir/schemas") }
dependencies {
    implementation(project(":core"))
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    // Align the serialization runtime shared by the app and Room migration-test APK.
    implementation(platform("org.jetbrains.kotlinx:kotlinx-serialization-bom:1.8.1"))
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.11.0")
    implementation("androidx.room:room-runtime:2.8.5")
    implementation("androidx.room:room-ktx:2.8.5")
    ksp("androidx.room:room-compiler:2.8.5")
    implementation("androidx.datastore:datastore-preferences:1.3.0")
    implementation("androidx.work:work-runtime-ktx:2.12.0")
    implementation("androidx.glance:glance-appwidget:1.2.0")
    implementation("androidx.glance:glance-material3:1.2.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation("androidx.room:room-testing:2.8.5")
}
