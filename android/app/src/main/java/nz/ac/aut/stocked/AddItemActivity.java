
package nz.ac.aut.stocked;

import android.os.Bundle;
import android.widget.ArrayAdapter;
import android.widget.Spinner;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.HttpURLConnection;
import java.net.URL;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;

import android.widget.Button;
import android.widget.EditText;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class AddItemActivity extends AppCompatActivity {

    private Spinner foodSpinner;
    private Spinner unitSpinner;
    private TextView addItemStatus;

    private ArrayList<String> foodIds = new ArrayList<>();

    private String accessToken;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_item);

        foodSpinner = findViewById(R.id.foodSpinner);
        unitSpinner = findViewById(R.id.unitSpinner);
        addItemStatus = findViewById(R.id.addItemStatus);

        accessToken = getIntent().getStringExtra("accessToken");

        String[] units = {"ITEM", "KG", "G", "L", "ML", "PACK"};

        ArrayAdapter<String> unitAdapter = new ArrayAdapter<>(
                this,
                android.R.layout.simple_spinner_item,
                units
        ) {
            @Override
            public android.view.View getView(int position, android.view.View convertView,
                                             android.view.ViewGroup parent) {
                TextView view = (TextView) super.getView(position, convertView, parent);
                view.setTextColor(android.graphics.Color.WHITE);
                return view;
            }
        };
        unitAdapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
        );
        unitSpinner.setAdapter(unitAdapter);

        EditText quantityInput = findViewById(R.id.quantityInput);
        Button addItemButton = findViewById(R.id.addItemButton);

        addItemButton.setOnClickListener(v -> {
            String quantityText = quantityInput.getText().toString().trim();

            if (foodIds.isEmpty()) {
                addItemStatus.setText("No food selected.");
                return;
            }

            if (quantityText.isEmpty()) {
                addItemStatus.setText("Please enter a quantity.");
                return;
            }

            double quantity;

            try {
                quantity = Double.parseDouble(quantityText);
            } catch (NumberFormatException e) {
                addItemStatus.setText("Invalid quantity.");
                return;
            }

            if (!Double.isFinite(quantity) || quantity <= 0) {
                addItemStatus.setText("Quantity must be greater than zero.");
                return;
            }

            String foodId = foodIds.get(foodSpinner.getSelectedItemPosition());
            String unit = unitSpinner.getSelectedItem().toString();

            addItemButton.setEnabled(false);
            addItemStatus.setText("Adding item...");

            new Thread(() -> addItem(foodId, quantity, unit, addItemButton)).start();
        });

        if (accessToken != null) {
            addItemStatus.setText("Loading foods...");
            new Thread(() -> loadFoods()).start();
        } else {
            addItemStatus.setText("Please log in again.");
        }
    }

    private void loadFoods() {
        HttpURLConnection connection = null;

        try {
            URL url = new URL("http://10.0.2.2:3000/api/food");
            connection = (HttpURLConnection) url.openConnection();

            connection.setRequestMethod("GET");
            connection.setRequestProperty(
                    "Authorization", "Bearer " + accessToken
            );
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);

            if (connection.getResponseCode() != 200) {
                runOnUiThread(() ->
                        addItemStatus.setText("Could not load foods.")
                );
                return;
            }

            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(connection.getInputStream())
            );

            StringBuilder response = new StringBuilder();
            String line;

            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            reader.close();

            JSONArray foods = new JSONArray(response.toString());

            ArrayList<String> foodNames = new ArrayList<>();
            ArrayList<String> ids = new ArrayList<>();

            for (int i = 0; i < foods.length(); i++) {
                JSONObject food = foods.getJSONObject(i);

                foodNames.add(food.getString("name"));
                ids.add(food.getString("id"));
            }

            runOnUiThread(() -> {
                foodIds = ids;

                ArrayAdapter<String> adapter = new ArrayAdapter<>(
                        this,
                        android.R.layout.simple_spinner_item,
                        foodNames
                ) {
                    @Override
                    public android.view.View getView(int position, android.view.View convertView,
                                                     android.view.ViewGroup parent) {
                        TextView view = (TextView) super.getView(position, convertView, parent);
                        view.setTextColor(android.graphics.Color.WHITE);
                        return view;
                    }
                };

                adapter.setDropDownViewResource(
                        android.R.layout.simple_spinner_dropdown_item
                );

                foodSpinner.setAdapter(adapter);

                if (foodNames.isEmpty()) {
                    addItemStatus.setText("No foods available.");
                } else {
                    addItemStatus.setText("");
                }
            });

        } catch (Exception e) {
            runOnUiThread(() ->
                    addItemStatus.setText("Unable to connect to Stocked.")
            );
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }


    private void addItem(String foodId, double quantity, String unit,
                         Button addItemButton) {

        HttpURLConnection connection = null;

        try {
            URL url = new URL("http://10.0.2.2:3000/api/items");
            connection = (HttpURLConnection) url.openConnection();

            connection.setRequestMethod("POST");
            connection.setRequestProperty(
                    "Authorization", "Bearer " + accessToken
            );
            connection.setRequestProperty(
                    "Content-Type", "application/json"
            );
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            connection.setDoOutput(true);

            JSONObject item = new JSONObject();
            item.put("foodId", foodId);
            item.put("quantity", quantity);
            item.put("unit", unit);

            byte[] body = item.toString().getBytes(StandardCharsets.UTF_8);

            try (OutputStream output = connection.getOutputStream()) {
                output.write(body);
            }

            int responseCode = connection.getResponseCode();

            runOnUiThread(() -> {
                if (responseCode == 201) {
                    setResult(RESULT_OK);
                    finish();
                } else {
                    addItemStatus.setText(
                            "Could not add item. Error: " + responseCode
                    );
                    addItemButton.setEnabled(true);
                }
            });

        } catch (Exception e) {
            runOnUiThread(() -> {
                addItemStatus.setText("Unable to connect to Stocked.");
                addItemButton.setEnabled(true);
            });
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

}
