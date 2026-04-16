package com.trainsmashai

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.trainsmash.arwprocessor.ArwProcessorPackage

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  /**
   * reactNativeHost is required by the ReactApplication interface (deprecated in New Arch but
   * still abstract — cannot be removed). Using DefaultReactNativeHost directly; Expo SDK 55
   * removed ReactNativeHostWrapper.
   */
  @Suppress("DEPRECATION")
  override val reactNativeHost: ReactNativeHost by lazy {
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> =
        PackageList(this).packages.apply {
          add(ArwProcessorPackage())
        }

      override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
    }
  }

  /** New Architecture host — used by RN 0.81 New Architecture runtime. */
  override val reactHost: ReactHost
    get() = ExpoReactHostFactory.getDefaultReactHost(
      applicationContext,
      PackageList(this).packages.apply { add(ArwProcessorPackage()) }
    )

  override fun onCreate() {
    super.onCreate()
    // SoLoader must be initialized before any loadLibrary() call (including
    // DefaultNewArchitectureEntryPoint.load → DefaultSoLoader.maybeLoadSoLibrary).
    SoLoader.init(this, OpenSourceMergedSoMapping)
    // Load New Architecture feature flags and SO libraries.
    DefaultNewArchitectureEntryPoint.load()
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
