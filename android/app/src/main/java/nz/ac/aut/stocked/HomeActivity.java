package nz.ac.aut.stocked;

import android.os.Bundle;
import android.widget.TextView;
import android.widget.Button;

import androidx.appcompat.app.AppCompatActivity;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

import org.json.JSONArray;
import org.json.JSONObject;

import android.content.Intent;

import android.widget.LinearLayout;
import android.view.Gravity;
import android.graphics.Color;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.work.Data;
import androidx.work.WorkManager;

import androidx.work.PeriodicWorkRequest;
import androidx.work.ExistingPeriodicWorkPolicy;
import java.util.concurrent.TimeUnit;

import android.widget.ImageButton;
import android.view.View;

public class HomeActivity extends AppCompatActivity {

    private static final String ITEMS_URL =
            "http://10.0.2.2:3000/api/items";

    private TextView pantryStatusText;
    private LinearLayout pantryItemsContainer;
    private String accessToken;
    private String userId;
    private LinearLayout expandedItemActions = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_home);

        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {

                requestPermissions(
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        100
                );
            }
        }

        pantryItemsContainer = findViewById(R.id.pantryItemsContainer);

        TextView welcomeText = findViewById(R.id.welcomeText);
        pantryStatusText = findViewById(R.id.pantryStatusText);

        String username = getIntent().getStringExtra("username");
        accessToken = getIntent().getStringExtra("accessToken");
        userId = getIntent().getStringExtra("userId");

        if (accessToken != null && userId != null) {
            Data inputData = new Data.Builder()
                    .putString("accessToken", accessToken)
                    .putString("userId", userId)
                    .build();

            PeriodicWorkRequest reminderRequest =
                    new PeriodicWorkRequest.Builder(
                            ExpiryReminderWorker.class,
                            24,
                            TimeUnit.HOURS
                    )
                            .setInputData(inputData)
                            .build();

            WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                    "expiry_reminders",
                    ExistingPeriodicWorkPolicy.UPDATE,
                    reminderRequest
            );
        }

        ImageButton refreshButton = findViewById(R.id.refreshButton);

        refreshButton.setOnClickListener(v -> {
            refreshButton.setEnabled(false);
            pantryStatusText.setText(R.string.loading_pantry);

            if (accessToken != null && userId != null) {
                new Thread(() -> {
                    loadItems(accessToken);

                    runOnUiThread(() ->
                            refreshButton.setEnabled(true)
                    );
                }).start();
            } else {
                pantryStatusText.setVisibility(View.VISIBLE);
                pantryStatusText.setText(R.string.pantry_load_failed);
                refreshButton.setEnabled(true);
            }
        });

        Button addItemNavButton = findViewById(R.id.addItemNavButton);

        addItemNavButton.setOnClickListener(v -> {
            Intent intent = new Intent(HomeActivity.this, AddItemActivity.class);
            intent.putExtra("accessToken", accessToken);
            intent.putExtra("userId", userId);
            startActivity(intent);
        });


        if (username != null && !username.isEmpty()) {
            welcomeText.setText(getString(R.string.welcome_user, username));
        }

    }

    private void loadItems(String accessToken) {
        HttpURLConnection connection = null;

        try {
            URL url = new URL(ITEMS_URL + "/" + userId);
            connection = (HttpURLConnection) url.openConnection();

            connection.setRequestMethod("GET");
            connection.setRequestProperty(
                    "Authorization",
                    "Bearer " + accessToken
            );

            int responseCode = connection.getResponseCode();

            if (responseCode == 200) {
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getInputStream())
                );

                StringBuilder response = new StringBuilder();
                String line;

                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }

                reader.close();

                String itemsJson = response.toString();
                JSONArray items = new JSONArray(itemsJson);

                if (items.length() == 0) {
                    runOnUiThread(() -> {
                        pantryItemsContainer.removeAllViews();
                        pantryStatusText.setVisibility(View.VISIBLE);
                        pantryStatusText.setText(R.string.pantry_empty);
                    });
                    return;
                }


                runOnUiThread(() -> {
                    pantryStatusText.setText("");
                    pantryStatusText.setVisibility(View.GONE);
                    pantryItemsContainer.removeAllViews();
                    expandedItemActions = null;

                    for (int i = 0; i < items.length(); i++) {
                        try {
                            JSONObject item = items.getJSONObject(i);
                            JSONObject food = item.getJSONObject("food");

                            String name = food.getString("name");
                            String category = food.getString("category");
                            String quantity = item.getString("quantity");
                            String unit = item.getString("unit");

                            String expiryDate = item.optString("expiryDate", "");

                            if (expiryDate.equals("null")) {
                                expiryDate = "";
                            }

                            LinearLayout row = new LinearLayout(this);
                            row.setOrientation(LinearLayout.VERTICAL);
                            row.setPadding(0, 18, 0, 18);

                            TextView itemText = new TextView(this);

                            String details = name + "\n"
                                    + quantity + " " + unit.toLowerCase(java.util.Locale.ROOT)
                                    + " · " + category;

                            if (!expiryDate.isEmpty()) {
                                String date = expiryDate.length() >= 10
                                        ? expiryDate.substring(0, 10)
                                        : expiryDate;

                                details += "\nExpires: " + date;
                            }

                            itemText.setText(details);
                            itemText.setTextColor(Color.WHITE);
                            itemText.setTextSize(14);

                            android.text.SpannableString styledText =
                                    new android.text.SpannableString(details);

                            styledText.setSpan(
                                    new android.text.style.RelativeSizeSpan(1.2f),
                                    0,
                                    name.length(),
                                    android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
                            );

                            styledText.setSpan(
                                    new android.text.style.StyleSpan(android.graphics.Typeface.BOLD),
                                    0,
                                    name.length(),
                                    android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
                            );

                            itemText.setText(styledText);

                            row.addView(itemText, new LinearLayout.LayoutParams(
                                    LinearLayout.LayoutParams.MATCH_PARENT,
                                    LinearLayout.LayoutParams.WRAP_CONTENT
                            ));

                            LinearLayout actionsLayout = new LinearLayout(this);
                            actionsLayout.setOrientation(LinearLayout.HORIZONTAL);
                            actionsLayout.setGravity(Gravity.CENTER_VERTICAL);
                            actionsLayout.setVisibility(View.GONE);

                            LinearLayout.LayoutParams actionsParams =
                                    new LinearLayout.LayoutParams(
                                            LinearLayout.LayoutParams.MATCH_PARENT,
                                            LinearLayout.LayoutParams.WRAP_CONTENT
                                    );

                            actionsParams.topMargin = 8;

                            Button editButton = new Button(this);
                            editButton.setText(R.string.edit_item);
                            editButton.setBackgroundTintList(
                                    android.content.res.ColorStateList.valueOf(
                                            Color.parseColor("#334155")
                                    )
                            );
                            editButton.setTextColor(Color.WHITE);


                            editButton.setOnClickListener(v -> {
                                Intent intent = new Intent(
                                        HomeActivity.this, EditItemActivity.class);
                                intent.putExtra("accessToken", accessToken);
                                intent.putExtra("userId", userId);
                                intent.putExtra("itemId", item.optString("id"));
                                startActivity(intent);
                            });

                            actionsLayout.addView(editButton,
                                    new LinearLayout.LayoutParams(
                                            0,
                                            LinearLayout.LayoutParams.WRAP_CONTENT,
                                            1
                                    ));

                            Button deleteButton = new Button(this);
                            deleteButton.setText("Delete");
                            deleteButton.setBackgroundTintList(
                                    android.content.res.ColorStateList.valueOf(
                                            Color.parseColor("#9F3444")
                                    )
                            );
                            deleteButton.setTextColor(Color.WHITE);


                            deleteButton.setOnClickListener(v -> {
                                new androidx.appcompat.app.AlertDialog.Builder(HomeActivity.this)
                                        .setTitle("Delete item")
                                        .setMessage("Are you sure you want to delete " + name + "?")
                                        .setNegativeButton("Cancel", null)
                                        .setPositiveButton("Delete", (dialog, which) -> {
                                            String itemId = item.optString("id");

                                            if (!itemId.isEmpty()) {
                                                new Thread(() -> deleteItem(itemId)).start();
                                            }
                                        })
                                        .show();
                            });

                            actionsLayout.addView(deleteButton,
                                    new LinearLayout.LayoutParams(
                                            0,
                                            LinearLayout.LayoutParams.WRAP_CONTENT,
                                            1
                                    ));
                            row.addView(actionsLayout, actionsParams);

                            row.setOnClickListener(v -> {
                                if (actionsLayout.getVisibility() == View.VISIBLE) {
                                    actionsLayout.setVisibility(View.GONE);
                                    expandedItemActions = null;
                                } else {
                                    if (expandedItemActions != null) {
                                        expandedItemActions.setVisibility(View.GONE);
                                    }

                                    actionsLayout.setVisibility(View.VISIBLE);
                                    expandedItemActions = actionsLayout;
                                }
                            });

                            pantryItemsContainer.addView(row);

                        } catch (Exception e) {
                            pantryStatusText.setText(R.string.pantry_item_display_failed);                        }
                    }
                });

            } else {
                runOnUiThread(() -> {
                    pantryStatusText.setVisibility(View.VISIBLE);
                    pantryStatusText.setText(R.string.pantry_load_failed);
                });
            }

        } catch (Exception e) {
            runOnUiThread(() -> {
                    pantryStatusText.setVisibility(View.VISIBLE);
                    pantryStatusText.setText(R.string.pantry_connection_failed);
        });

        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private void deleteItem(String itemId) {
        HttpURLConnection connection = null;

        try {
            URL url = new URL(ITEMS_URL + "/" + userId + "/" + itemId);
            connection = (HttpURLConnection) url.openConnection();

            connection.setRequestMethod("DELETE");
            connection.setRequestProperty(
                    "Authorization", "Bearer " + accessToken
            );
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);

            int responseCode = connection.getResponseCode();

            if (responseCode == 200) {
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getInputStream())
                );

                StringBuilder response = new StringBuilder();
                String line;

                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();

                JSONObject result = new JSONObject(response.toString());

                if (result.optBoolean("success", false)) {
                    runOnUiThread(() -> {
                        pantryStatusText.setVisibility(View.VISIBLE);
                        pantryStatusText.setText("Item deleted successfully.");
                        new Thread(() -> loadItems(accessToken)).start();
                    });
                    return;
                }
            }

            runOnUiThread(() -> {
                pantryStatusText.setVisibility(View.VISIBLE);
                pantryStatusText.setText("Could not delete item. Error: " + responseCode);
            });

        } catch (Exception e) {
            runOnUiThread(() -> {
                pantryStatusText.setVisibility(View.VISIBLE);
                pantryStatusText.setText("Unable to delete item.");
            });
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();

        if (accessToken != null && userId != null && pantryStatusText != null) {
            pantryStatusText.setVisibility(View.VISIBLE);
            pantryStatusText.setText(R.string.loading_pantry);
            new Thread(() -> loadItems(accessToken)).start();
        }
    }
}