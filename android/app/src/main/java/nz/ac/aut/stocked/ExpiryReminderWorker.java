package nz.ac.aut.stocked;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import android.content.SharedPreferences;

public class ExpiryReminderWorker extends Worker {

    public ExpiryReminderWorker(
            @NonNull Context context,
            @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        String accessToken = getInputData().getString("accessToken");

        if (accessToken == null) {
            Log.e("ExpiryReminder", "No access token available");
            return Result.failure();
        }

        HttpURLConnection connection = null;

        try {
            URL url = new URL("http://10.0.2.2:3000/api/items");
            connection = (HttpURLConnection) url.openConnection();

            connection.setRequestMethod("GET");
            connection.setRequestProperty(
                    "Authorization", "Bearer " + accessToken
            );
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);

            int responseCode = connection.getResponseCode();

            if (responseCode == 401 || responseCode == 403) {
                Log.e("ExpiryReminder", "Authentication failed");
                return Result.failure();
            }

            if (responseCode != 200) {
                Log.e("ExpiryReminder", "API error: " + responseCode);
                return Result.retry();
            }

            StringBuilder response = new StringBuilder();

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(connection.getInputStream()))) {

                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
            }

            JSONArray items = new JSONArray(response.toString());
            LocalDate today = LocalDate.now();

            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);

                String expiryDate = item.optString("expiryDate", "");

                if (expiryDate.isEmpty() || expiryDate.equals("null")) {
                    continue;
                }

                LocalDate expiry = LocalDate.parse(
                        expiryDate.substring(0, 10)
                );

                long daysRemaining = ChronoUnit.DAYS.between(today, expiry);

                if (daysRemaining >= 0 && daysRemaining <= 3) {
                    JSONObject food = item.getJSONObject("food");
                    String name = food.getString("name");

                    Log.d(
                            "ExpiryReminder",
                            name + " expires in " + daysRemaining + " days"
                    );

                    String itemId = item.optString("id");

                    SharedPreferences preferences = getApplicationContext()
                            .getSharedPreferences("expiry_reminders", Context.MODE_PRIVATE);

                    String reminderKey = itemId + "_" + expiryDate.substring(0, 10);
                    String todayString = today.toString();

                    String lastNotified = preferences.getString(reminderKey, "");

                    if (!todayString.equals(lastNotified)) {
                        sendNotification(name, daysRemaining, itemId.hashCode());

                        preferences.edit()
                                .putString(reminderKey, todayString)
                                .apply();
                    }
                }
            }

            return Result.success();

        } catch (Exception e) {
            Log.e("ExpiryReminder", "Could not check expiry dates", e);
            return Result.retry();

        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private void sendNotification(String name, long daysRemaining, int notificationId) {
        Context context = getApplicationContext();
        String channelId = "expiry_reminders";

        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Expiry Reminders",
                    NotificationManager.IMPORTANCE_DEFAULT
            );

            NotificationManager manager =
                    context.getSystemService(NotificationManager.class);

            manager.createNotificationChannel(channel);
        }

        String message;

        if (daysRemaining == 0) {
            message = name + " expires today!";
        } else if (daysRemaining == 1) {
            message = name + " expires tomorrow.";
        } else {
            message = name + " expires in " + daysRemaining + " days.";
        }

        NotificationCompat.Builder notification =
                new NotificationCompat.Builder(context, channelId)
                        .setSmallIcon(R.drawable.ic_launcher_foreground)
                        .setContentTitle("Stocked - Expiry Reminder")
                        .setContentText(message)
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                        .setAutoCancel(true);

        if (Build.VERSION.SDK_INT >= 33 &&
                context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationManagerCompat.from(context)
                .notify(notificationId, notification.build());
    }
}