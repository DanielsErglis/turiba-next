plugins {
    kotlin("jvm") version "2.3.21" apply false
    id("com.android.application") version "9.4.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.3.21" apply false
    id("com.google.devtools.ksp") version "2.3.13" apply false
}
tasks.wrapper {
    gradleVersion = "9.6.0"
    distributionSha256Sum = "bbaeb2fef8710818cf0e261201dab964c572f92b942812df0c3620d62a529a01"
}
allprojects {
    dependencyLocking { lockAllConfigurations() }
}
