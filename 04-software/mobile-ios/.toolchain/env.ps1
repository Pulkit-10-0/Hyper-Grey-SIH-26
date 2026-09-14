# SeaNergy self-contained toolchain.
# Dot-source before any build command:   . .\.toolchain\env.ps1
# Everything lives under SeaNergy\.toolchain — delete that folder and it is all gone.

$Root = Split-Path -Parent $PSScriptRoot          # ...\SeaNergy
$TC   = Join-Path $Root ".toolchain"

$NodeDir    = Join-Path $TC "node"
$JavaDir    = Join-Path $TC "jdk"
$SdkDir     = Join-Path $TC "android-sdk"
# Gradle cache. The files live inside the project at .toolchain\gradle-home, but
# Gradle is pointed at a short junction (D:\sng) instead. Windows ninja is still
# limited to MAX_PATH (260 chars) even with LongPathsEnabled set, and React
# Native's prefab header tree blows past that from a deep project directory.
# The junction keeps the data in the project while giving the compiler a short path.
$GradleReal = Join-Path $TC "gradle-home"
$GradleLink = "D:\sng"
if (-not (Test-Path $GradleLink)) {
  New-Item -ItemType Junction -Path $GradleLink -Target $GradleReal -ErrorAction SilentlyContinue | Out-Null
}
$GradleHome = if (Test-Path $GradleLink) { $GradleLink } else { $GradleReal }

if (Test-Path $JavaDir) { $env:JAVA_HOME = $JavaDir }
if (Test-Path $SdkDir)  { $env:ANDROID_HOME = $SdkDir; $env:ANDROID_SDK_ROOT = $SdkDir }
$env:GRADLE_USER_HOME = $GradleHome

# Keep Gradle off the C: drive entirely
$env:GRADLE_OPTS = "-Dorg.gradle.native.dir=$GradleHome\native -Xmx4g"

$paths = @()
if (Test-Path $NodeDir) { $paths += $NodeDir }
if (Test-Path $JavaDir) { $paths += (Join-Path $JavaDir "bin") }
if (Test-Path $SdkDir)  {
  $paths += (Join-Path $SdkDir "platform-tools")
  $paths += (Join-Path $SdkDir "cmdline-tools\latest\bin")
}
$env:PATH = ($paths -join ";") + ";" + $env:PATH

Write-Host "SeaNergy toolchain active" -ForegroundColor Cyan
Write-Host ("  node         " + (& node -v 2>$null))
Write-Host ("  JAVA_HOME    " + $env:JAVA_HOME)
Write-Host ("  ANDROID_HOME " + $env:ANDROID_HOME)
Write-Host ("  GRADLE_HOME  " + $env:GRADLE_USER_HOME)
