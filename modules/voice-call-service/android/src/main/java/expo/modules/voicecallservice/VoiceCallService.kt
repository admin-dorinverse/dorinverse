// The Android service that keeps a voice call connected while the app is in the background. It shows the ongoing
// "Voice call in progress" notice, and tapping the notice opens the app again. Android stops apps in the
// background from using the internet and microphone unless a service like this is running.
package expo.modules.voicecallservice

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

private const val TAG = "VoiceCallService"

/** The service behind the call notice; the app starts it on joining a call and stops it on leaving. */
class VoiceCallService : Service() {
  /** True once the notice is showing; a later start only changes what the service is allowed to use. */
  private var showing = false

  /** Makes the notice's channel (its name in the phone's notification settings) the first time. */
  override fun onCreate() {
    super.onCreate()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (manager.getNotificationChannel(CHANNEL_ID) == null) {
        val channel = NotificationChannel(CHANNEL_ID, "Voice call", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Shows while you're on a voice call"
          setShowBadge(false)
          enableVibration(false)
          setSound(null, null)
        }
        manager.createNotificationChannel(channel)
      }
    }
  }

  /** Shows the notice (or updates it) with the words the app sent. */
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Voice call in progress"
    val body = intent?.getStringExtra(EXTRA_BODY) ?: "Tap to go back to the call."
    val notice = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(body)
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setOngoing(true)
      .setSilent(true)
      .setContentIntent(openAppIntent())
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
    // The microphone kind needs the microphone allowed; the sound-playing kind always works, so it's the fallback.
    val started = goForeground(notice, wantedKinds()) || (!showing && goForeground(notice, PLAYBACK_KIND))
    if (!started && !showing) stopSelf()
    return START_NOT_STICKY
  }

  /** Puts the notice up as this service's own; gives back false if Android refused. */
  private fun goForeground(notice: android.app.Notification, kinds: Int): Boolean {
    return try {
      ServiceCompat.startForeground(this, NOTICE_ID, notice, kinds)
      showing = true
      true
    } catch (e: Exception) {
      Log.w(TAG, "Couldn't show the voice call notice", e)
      false
    }
  }

  /** The kinds of work to ask for: the microphone too when the person has allowed it. */
  private fun wantedKinds(): Int {
    val micAllowed = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
    return if (micAllowed && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or PLAYBACK_KIND
    } else {
      PLAYBACK_KIND
    }
  }

  /** What tapping the notice does: brings the app back, the same as tapping its icon. */
  private fun openAppIntent(): PendingIntent? {
    return packageManager.getLaunchIntentForPackage(packageName)?.let { appIntent ->
      PendingIntent.getActivity(this, 0, appIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
  }

  /** Swiping the app away ends the call, so the service ends too. */
  override fun onTaskRemoved(rootIntent: Intent?) {
    super.onTaskRemoved(rootIntent)
    stopSelf()
  }

  /** Takes the notice down when the service ends. */
  override fun onDestroy() {
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    showing = false
    super.onDestroy()
  }

  /** Nothing binds to this service; the app only starts and stops it. */
  override fun onBind(intent: Intent?): IBinder? = null

  /** The names the app and the service share. */
  companion object {
    /** The notice's channel, kept apart from the app's other notifications. */
    const val CHANNEL_ID = "voice-call"
    /** The notice's number, so updating it replaces it. */
    const val NOTICE_ID = 4307
    /** The notice's title, sent by the app. */
    const val EXTRA_TITLE = "title"
    /** The notice's second line, sent by the app. */
    const val EXTRA_BODY = "body"
    /** The sound-playing kind of work, which hears the call. */
    private val PLAYBACK_KIND =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else 0
  }
}
