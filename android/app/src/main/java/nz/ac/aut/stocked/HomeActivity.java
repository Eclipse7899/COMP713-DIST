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

public class HomeActivity extends AppCompatActivity {

    private static final String ITEMS_URL =
            "http://10.0.2.2:3000/api/items";

    private TextView pantryStatusText;
    private LinearLayout pantryItemsContainer;
    private String accessToken;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_home);

        pantryItemsContainer = findViewById(R.id.pantryItemsContainer);

        TextView welcomeText = findViewById(R.id.welcomeText);
        pantryStatusText = findViewById(R.id.pantryStatusText);

        String username = getIntent().getStringExtra("username");
        accessToken = getIntent().getStringExtra("accessToken");

        Button refreshButton = findViewById(R.id.refreshButton);

        refreshButton.setOnClickListener(v -> {
            refreshButton.setEnabled(false);
            pantryStatusText.setText(R.string.loading_pantry);

            if (accessToken != null) {
                new Thread(() -> {
                    loadItems(accessToken);

                    runOnUiThread(() ->
                            refreshButton.setEnabled(true)
                    );
                }).start();
            } else {
                pantryStatusText.setText(R.string.pantry_load_failed);
                refreshButton.setEnabled(true);
            }
        });

        Button addItemNavButton = findViewById(R.id.addItemNavButton);

        addItemNavButton.setOnClickListener(v -> {
            Intent intent = new Intent(HomeActivity.this, AddItemActivity.class);
            intent.putExtra("accessToken", accessToken);
            startActivity(intent);
        });

        Button deleteItemNavButton = findViewById(R.id.deleteItemNavButton);

        deleteItemNavButton.setOnClickListener(v -> {
            Intent intent = new Intent(HomeActivity.this, DeleteItemActivity.class);
            intent.putExtra("accessToken", accessToken);
            startActivity(intent);
        });

        if (username != null && !username.isEmpty()) {
            welcomeText.setText(getString(R.string.welcome_user, username));
        }

    }

    private void loadItems(String accessToken) {
        HttpURLConnection connection = null;

        try {
            URL url = new URL(ITEMS_URL);
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
                        pantryStatusText.setText(R.string.pantry_empty);
                    });
                    return;
                }


                runOnUiThread(() -> {
                    pantryStatusText.setText("");
                    pantryItemsContainer.removeAllViews();

                    for (int i = 0; i < items.length(); i++) {
                        try {
                            JSONObject item = items.getJSONObject(i);
                            JSONObject food = item.getJSONObject("food");

                            String name = food.getString("name");
                            String category = food.getString("category");
                            String quantity = item.getString("quantity");
                            String unit = item.getString("unit");

                            LinearLayout row = new LinearLayout(this);
                            row.setOrientation(LinearLayout.HORIZONTAL);
                            row.setGravity(Gravity.CENTER_VERTICAL);
                            row.setPadding(0, 12, 0, 12);

                            TextView itemText = new TextView(this);
                            itemText.setText(getString(
                                    R.string.pantry_item_details,
                                    name, quantity, unit, category
                            ));
                            itemText.setTextColor(Color.WHITE);
                            itemText.setTextSize(16);

                            row.addView(itemText, new LinearLayout.LayoutParams(
                                    0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));

                            Button editButton = new Button(this);
                            editButton.setText(R.string.edit_item);

                            editButton.setOnClickListener(v -> {
                                Intent intent = new Intent(
                                        HomeActivity.this, EditItemActivity.class);
                                intent.putExtra("accessToken", accessToken);
                                intent.putExtra("itemId", item.optString("id"));
                                startActivity(intent);
                            });

                            row.addView(editButton);
                            pantryItemsContainer.addView(row);

                        } catch (Exception e) {
                            pantryStatusText.setText(R.string.pantry_item_display_failed);                        }
                    }
                });

            } else {
                runOnUiThread(() ->
                        pantryStatusText.setText(R.string.pantry_load_failed)
                );
            }

        } catch (Exception e) {
            runOnUiThread(() ->
                    pantryStatusText.setText(R.string.pantry_connection_failed)
            );

        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();

        if (accessToken != null && pantryStatusText != null) {
            pantryStatusText.setText(R.string.loading_pantry);
            new Thread(() -> loadItems(accessToken)).start();
        }
    }
}