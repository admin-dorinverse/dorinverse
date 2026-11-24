// The app's way in to the voice call service: "start" shows the call notice and keeps the call connected in the
// background, "stop" takes it down. Both are safe to call more than once.
package expo.modules.voicecallservice

import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Starts and stops VoiceCallService for the app's JavaScript. */
class VoiceCallServiceModule : Module() {
  /** The functions the app can call. */
  override fun definition() = ModuleDefinition {
    Name("VoiceCallService")

    // Shows the notice with these words; gives back false if Android wouldn't start it (the call still works in the app).
    Function("start") { title: String, body: String ->
      val context = appContext.reactContext
      if (context == null) {
        false
      } else {
        val intent = Intent(context, VoiceCallService::class.java)
          .putExtra(VoiceCallService.EXTRA_TITLE, title)
          .putExtra(VoiceCallService.EXTRA_BODY, body)
        try {
          ContextCompat.startForegroundService(context, intent)
          true
        } catch (e: Exception) {
          Log.w("VoiceCallService", "Couldn't start the voice call service", e)
          false
        }
      }
    }

    // Takes the notice down and lets Android treat the app as a normal background app again.
    Function("stop") {
      val context = appContext.reactContext
      if (context != null) {
        context.stopService(Intent(context, VoiceCallService::class.java))
      }
      Unit
    }
  }
}
