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
}