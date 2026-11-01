const { withAndroidManifest, withMainActivity, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const KOTLIN_SERVICE_SOURCE = `package com.wallsreet.mt5monitor

import android.app.*
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import org.json.JSONArray
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class MT5MonitorService : Service() {

    companion object {
        private const val SERVICE_CHANNEL_ID = "mt5_bg_monitor_service"
        private const val NORMAL_CHANNEL_ID = "mt5_normal_v3"
        private const val NEAR_ENTRY_CHANNEL_ID = "mt5_near_entry_v3"
        private const val SERVICE_NOTIF_ID = 7001
        private const val POLL_URL = "https://mt5-monitor-i6si.onrender.com/api/notifications/poll?key=mt5ea_demo_key_12345"

        @Volatile
        private var isRunning = false

        fun start(context: Context) {
            try {
                val intent = Intent(context, MT5MonitorService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private var workerThread: Thread? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        startForegroundSafely()
        acquireWakeLock()
        startPollingLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannels()
        startForegroundSafely()
        if (!isRunning || workerThread == null || !workerThread!!.isAlive) {
            startPollingLoop()
        }
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        scheduleRestart()
    }

    override fun onDestroy() {
        isRunning = false
        releaseWakeLock()
        scheduleRestart()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun acquireWakeLock() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MT5Monitor::BgWakeLock").apply {
                setReferenceCounted(false)
                acquire()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun scheduleRestart() {
        try {
            val restartIntent = Intent(applicationContext, MT5MonitorService::class.java).also {
                it.setPackage(packageName)
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_ONE_SHOT
            }
            val pendingIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                PendingIntent.getForegroundService(applicationContext, 1001, restartIntent, flags)
            } else {
                PendingIntent.getService(applicationContext, 1001, restartIntent, flags)
            }
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.set(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + 3000L,
                pendingIntent
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // 1. Silent persistent foreground service channel
        val serviceChannel = NotificationChannel(
            SERVICE_CHANNEL_ID,
            "MT5 Live Connection",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Keeps MT5 Trade Monitor connected for real-time alerts when app is closed"
            setShowBadge(false)
            enableVibration(false)
            setSound(null, null)
        }
        nm.createNotificationChannel(serviceChannel)

        val audioAttrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        // 2. Normal 3-second notification channel
        val normalSoundUri = Uri.parse("android.resource://" + packageName + "/raw/normal_notification")
        val normalChannel = NotificationChannel(
            NORMAL_CHANNEL_ID,
            "Trade Alerts (Standard 3s)",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Standard notifications for trade opened, closed, and limit activations"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 250, 200, 250)
            setSound(normalSoundUri, audioAttrs)
            setShowBadge(true)
        }
        nm.createNotificationChannel(normalChannel)

        // 3. Urgent 9-second near-entry notification channel
        val nearEntrySoundUri = Uri.parse("android.resource://" + packageName + "/raw/near_entry_alert")
        val nearEntryChannel = NotificationChannel(
            NEAR_ENTRY_CHANNEL_ID,
            "Price Near Entry Alerts (Urgent 9s)",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Urgent 9-second tone when price approaches your pending limit order"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 500)
            setSound(nearEntrySoundUri, audioAttrs)
            setShowBadge(true)
        }
        nm.createNotificationChannel(nearEntryChannel)
    }

    private fun startForegroundSafely() {
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, pendingFlags)

            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, SERVICE_CHANNEL_ID)
            } else {
                Notification.Builder(this)
            }

            val notification = builder
                .setContentTitle("MT5 Trade Monitor Active")
                .setContentText("Listening 24/7 for live MT5 trade & limit alerts")
                .setSmallIcon(applicationInfo.icon)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(
                    SERVICE_NOTIF_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(SERVICE_NOTIF_ID, notification)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun startPollingLoop() {
        isRunning = true
        workerThread = Thread {
            while (isRunning) {
                try {
                    pollBackendNotifications()
                } catch (e: Exception) {
                    // Ignore transient network errors
                }
                try {
                    Thread.sleep(5000L)
                } catch (ie: InterruptedException) {
                    break
                }
            }
        }.apply {
            isDaemon = true
            start()
        }
    }

    private fun pollBackendNotifications() {
        val url = URL(POLL_URL)
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 7000
            readTimeout = 7000
            setRequestProperty("Accept", "application/json")
        }

        try {
            if (conn.responseCode != 200) return
            val reader = BufferedReader(InputStreamReader(conn.inputStream))
            val response = StringBuilder()
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                response.append(line)
            }
            reader.close()

            val arr = JSONArray(response.toString())
            val prefs = getSharedPreferences("mt5_native_notifs", Context.MODE_PRIVATE)
            val initialized = prefs.getBoolean("initialized", false)
            val seenSet = prefs.getStringSet("seen_ids", emptySet())?.toMutableSet() ?: mutableSetOf()

            if (!initialized) {
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    val id = obj.optString("id", "")
                    if (id.isNotEmpty()) seenSet.add(id)
                }
                prefs.edit()
                    .putBoolean("initialized", true)
                    .putStringSet("seen_ids", seenSet)
                    .apply()
                return
            }

            val newItems = mutableListOf<org.json.JSONObject>()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val id = obj.optString("id", "")
                if (id.isNotEmpty() && !seenSet.contains(id)) {
                    seenSet.add(id)
                    newItems.add(obj)
                }
            }

            if (newItems.isNotEmpty()) {
                prefs.edit().putStringSet("seen_ids", seenSet).apply()
                // Show oldest unseen first
                for (i in newItems.indices.reversed()) {
                    val item = newItems[i]
                    val id = item.optString("id", "")
                    val type = item.optString("type", "")
                    val title = item.optString("title", "MT5 Alert")
                    val body = item.optString("body", "")
                    showNativeAlert(id, type, title, body)
                }
            }
        } finally {
            conn.disconnect()
        }
    }

    private fun showNativeAlert(id: String, type: String, title: String, body: String) {
        try {
            val isNearEntry = type == "PRICE_NEAR_ENTRY" || title.lowercase().contains("near entry")
            val channelId = if (isNearEntry) NEAR_ENTRY_CHANNEL_ID else NORMAL_CHANNEL_ID

            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getActivity(this, id.hashCode(), launchIntent, pendingFlags)

            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, channelId)
            } else {
                Notification.Builder(this)
            }

            val notification = builder
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(Notification.BigTextStyle().bigText(body))
                .setSmallIcon(applicationInfo.icon)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()

            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.notify(id.hashCode(), notification)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

class MT5BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED ||
            intent?.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            MT5MonitorService.start(context)
        }
    }
}
`;

function withBackgroundMonitorService(config) {
  // 1. Add required permissions, Service, and BootReceiver to AndroidManifest.xml
  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const requiredPermissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
      'android.permission.WAKE_LOCK',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.VIBRATE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ];

    for (const perm of requiredPermissions) {
      const exists = manifest['uses-permission'].some(
        (p) => p.$ && p.$['android:name'] === perm
      );
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    }

    const app = manifest.application?.[0];
    if (app) {
      if (!app.service) app.service = [];
      const hasService = app.service.some(
        (s) => s.$ && s.$['android:name'] === '.MT5MonitorService'
      );
      if (!hasService) {
        app.service.push({
          $: {
            'android:name': '.MT5MonitorService',
            'android:enabled': 'true',
            'android:exported': 'false',
            'android:stopWithTask': 'false',
            'android:foregroundServiceType': 'dataSync',
          },
        });
      }

      if (!app.receiver) app.receiver = [];
      const hasReceiver = app.receiver.some(
        (r) => r.$ && r.$['android:name'] === '.MT5BootReceiver'
      );
      if (!hasReceiver) {
        app.receiver.push({
          $: {
            'android:name': '.MT5BootReceiver',
            'android:enabled': 'true',
            'android:exported': 'true',
          },
          'intent-filter': [
            {
              action: [
                { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
                { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
              ],
            },
          ],
        });
      }
    }

    return modConfig;
  });

  // 2. Start MT5MonitorService inside MainActivity.onCreate
  config = withMainActivity(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    if (!contents.includes('MT5MonitorService.start(this)')) {
      contents = contents.replace(
        /super\.onCreate\([^)]*\)/,
        (match) => `${match}\n    MT5MonitorService.start(this)`
      );
      modConfig.modResults.contents = contents;
    }
    return modConfig;
  });

  // 3. Write MT5MonitorService.kt next to MainActivity.kt
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.platformProjectRoot;
      const pkgDir = path.join(
        projectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'wallsreet',
        'mt5monitor'
      );
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, 'MT5MonitorService.kt'),
        KOTLIN_SERVICE_SOURCE,
        'utf8'
      );
      return modConfig;
    },
  ]);

  return config;
}

module.exports = withBackgroundMonitorService;

