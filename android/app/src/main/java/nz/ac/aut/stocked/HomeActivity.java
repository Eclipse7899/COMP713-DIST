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

public class HomeActivity extends AppCompatActivity {

    private static final String ITEMS_URL =
            "http://10.0.2.2:3000/api/items";

    private TextView pantryStatusText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_home);

        TextView welcomeText = findViewById(R.id.welcomeText);
        pantryStatusText = findViewById(R.id.pantryStatusText);

        String username = getIntent().getStringExtra("username");
        String accessToken = getIntent().getStringExtra("accessToken");

        Button refreshButton = findViewById(R.id.refreshButton);

        refreshButton.setOnClickListener(v -> {
            pantryStatusText.setText("Loading pantry...");

            if (accessToken != null) {
                new Thread(() -> loadItems(accessToken)).start();
            } else {
                pantryStatusText.setText("Could not load pantry.");
            }
        });

        if (username != null && !username.isEmpty()) {
            welcomeText.setText("Welcome, " + username);
        }

        if (accessToken != null) {
            new Thread(() -> loadItems(accessToken)).start();
        } else {
            pantryStatusText.setText("Could not load pantry.");
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
                    runOnUiThread(() ->
                            pantryStatusText.setText("Your pantry is empty.")
                    );
                    return;
                }

                StringBuilder itemText = new StringBuilder();

                for (int i = 0; i < items.length(); i++) {
                    JSONObject item = items.getJSONObject(i);
                    JSONObject food = item.getJSONObject("food");

                    String name = food.getString("name");
                    String category = food.getString("category");
                    int quantity = item.getInt("quantity");
                    String unit = item.getString("unit");

                    itemText.append(name)
                            .append("\n")
                            .append(quantity)
                            .append(" ")
                            .append(unit)
                            .append("\n")
                            .append(category);

                    if (i < items.length() - 1) {
                        itemText.append("\n\n");
                    }
                }

                runOnUiThread(() ->
                        pantryStatusText.setText(itemText.toString())
                );

            } else {
                runOnUiThread(() ->
                        pantryStatusText.setText("Could not load pantry.")
                );
            }

        } catch (Exception e) {
            runOnUiThread(() ->
                    pantryStatusText.setText("Unable to connect to Stocked.")
            );

        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
}