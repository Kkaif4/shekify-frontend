# Project specific ProGuard rules for Capacitor
# Prevent obfuscation and stripping of Capacitor native bridge classes
-keep class com.getcapacitor.** { *; }

# Keep Cordova plugin classes
-keep class org.apache.cordova.** { *; }

# Prevent obfuscation of JSInterface methods used by web views
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve line numbers and source file attributes for debugging stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
