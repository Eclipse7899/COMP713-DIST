
package nz.ac.aut.stocked;

import android.app.Activity;
import android.os.Bundle;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.HttpURLConnection;
import java.net.URL;
import java.io.OutputStream;
import java.util.ArrayList;

import android.widget.TextView;
import android.graphics.Color;

import java.io.BufferedReader;
import java.io.InputStreamReader;

import androidx.annotation.NonNull;

import android.app.DatePickerDialog;
import java.util.Calendar;
import java.util.Locale;

public class EditItemActivity extends Activity {

    private final String baseUrl = "http://10.0.2.2:3000";
    private String accessToken;
    private String userId;

    private TextView selectedItemText;
    private int selectedItemPosition = -1;
    private Spinner unitSpinner;
    private EditText quantityInput;
    private Button saveButton;
    private Button expiryDateButton;
    private Button removeExpiryButton;
    private TextView expiryDateText;
    private String selectedExpiryDate = null;

    private final ArrayList<JSONObject> items = new ArrayList<>();
    private final String[] units = {"ITEM", "KG", "G", "L", "ML", "PACK"};

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_edit_item);

        accessToken = getIntent().getStringExtra("accessToken");
        userId = getIntent().getStringExtra("userId");


        selectedItemText = findViewById(R.id.selectedItemText);
        unitSpinner = findViewById(R.id.unitSpinner);
        quantityInput = findViewById(R.id.quantityInput);
        saveButton = findViewById(R.id.saveButton);

        expiryDateButton = findViewById(R.id.expiryDateButton);
        removeExpiryButton = findViewById(R.id.removeExpiryButton);
        expiryDateText = findViewById(R.id.expiryDateText);

        ArrayAdapter<String> unitAdapter = new ArrayAdapter<>(
                this, android.R.layout.simple_spinner_item, units) {
            @Override
            @NonNull
            public android.view.View getView(
                    int position,
                    android.view.View convertView,
                    @NonNull android.view.ViewGroup parent) {

                android.view.View view =
                        super.getView(position, convertView, parent);

                ((TextView) view).setTextColor(Color.WHITE);
                return view;
            }
        };

        unitAdapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item);
        unitSpinner.setAdapter(unitAdapter);

        saveButton.setOnClickListener(v -> saveChanges());

        expiryDateButton.setOnClickListener(v -> {
            Calendar calendar = Calendar.getInstance();

            DatePickerDialog datePicker = new DatePickerDialog(
                    this,
                    (view, year, month, dayOfMonth) -> {
                        selectedExpiryDate = String.format(
                                Locale.US, "%04d-%02d-%02d",
                                year, month + 1, dayOfMonth
                        );

                        expiryDateText.setText(selectedExpiryDate);
                    },
                    calendar.get(Calendar.YEAR),
                    calendar.get(Calendar.MONTH),
                    calendar.get(Calendar.DAY_OF_MONTH)
            );

            datePicker.show();
        });

        removeExpiryButton.setOnClickListener(v -> {
            selectedExpiryDate = null;
            expiryDateText.setText("No expiry date");
        });

        loadItems();
    }

    private void loadItems() {
        saveButton.setEnabled(false);

        new Thread(() -> {
            try {
                URL url = new URL(baseUrl + "/api/items/" + userId);
                HttpURLConnection connection =
                        (HttpURLConnection) url.openConnection();

                connection.setRequestMethod("GET");
                connection.setRequestProperty(
                        "Authorization", "Bearer " + accessToken);
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);

                if (connection.getResponseCode() != 200) {
                    throw new Exception("Failed to load items");
                }


                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getInputStream())
                );

                StringBuilder responseBuilder = new StringBuilder();
                String line;

                while ((line = reader.readLine()) != null) {
                    responseBuilder.append(line);
                }

                reader.close();

                String response = responseBuilder.toString();


                connection.disconnect();

                JSONArray result = new JSONArray(response);
                ArrayList<JSONObject> loadedItems = new ArrayList<>();

                for (int i = 0; i < result.length(); i++) {
                    JSONObject item = result.getJSONObject(i);
                    loadedItems.add(item);


                }

                runOnUiThread(() -> {
                    items.clear();
                    items.addAll(loadedItems);


                    selectedItemPosition = -1;

                    String selectedItemId = getIntent().getStringExtra("itemId");

                    for (int i = 0; i < items.size(); i++) {
                        if (items.get(i).optString("id").equals(selectedItemId)) {
                            selectedItemPosition = i;
                            break;
                        }
                    }

                    if (selectedItemPosition >= 0) {
                        JSONObject item = items.get(selectedItemPosition);
                        JSONObject food = item.optJSONObject("food");

                        if (food != null) {
                            selectedItemText.setText(food.optString("name"));
                        }

                        fillItemDetails(selectedItemPosition);
                        saveButton.setEnabled(true);
                    } else {
                        selectedItemText.setText(R.string.item_not_found);
                        saveButton.setEnabled(false);
                    }


                });

            } catch (Exception e) {
                runOnUiThread(() ->
                        Toast.makeText(this,
                                "Could not load pantry items",
                                Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void fillItemDetails(int position) {
        if (position < 0 || position >= items.size()) {
            return;
        }

        JSONObject item = items.get(position);

        try {
            quantityInput.setText(item.getString("quantity"));

            String unit = item.getString("unit");

            for (int i = 0; i < units.length; i++) {
                if (units[i].equals(unit)) {
                    unitSpinner.setSelection(i);
                    break;
                }
            }
            String expiryDate = item.optString("expiryDate", "");

            if (!expiryDate.isEmpty() && !expiryDate.equals("null")) {
                selectedExpiryDate = expiryDate.substring(0, 10);
                expiryDateText.setText(selectedExpiryDate);
            } else {
                selectedExpiryDate = null;
                expiryDateText.setText("No expiry date");
            }

        } catch (Exception e) {
            Toast.makeText(this,
                    "Could not load item details",
                    Toast.LENGTH_SHORT).show();
        }
    }

    private void saveChanges() {
        int position = selectedItemPosition;

        if (position < 0 || position >= items.size()) {
            Toast.makeText(this,
                    "Select an item", Toast.LENGTH_SHORT).show();
            return;
        }

        String quantityText = quantityInput.getText().toString().trim();

        double quantity;

        try {
            quantity = Double.parseDouble(quantityText);

            if (!Double.isFinite(quantity) || quantity <= 0) {
                throw new NumberFormatException();
            }

        } catch (NumberFormatException e) {
            quantityInput.setError("Enter a quantity greater than 0");
            return;
        }

        JSONObject item = items.get(position);

        try {
            String itemId = item.getString("id");
            String foodId = item.getString("foodId");
            String unit = unitSpinner.getSelectedItem().toString();

            JSONObject body = new JSONObject();
            body.put("foodId", foodId);
            body.put("quantity", quantity);
            body.put("unit", unit);

            if (selectedExpiryDate != null) {
                body.put("expiryDate", selectedExpiryDate + "T00:00:00.000Z");
            } else {
                body.put("expiryDate", JSONObject.NULL);
            }

            saveButton.setEnabled(false);

            new Thread(() -> {
                HttpURLConnection connection = null;

                try {
                    URL url = new URL(baseUrl + "/api/items/" + userId + "/" + itemId);
                    connection = (HttpURLConnection) url.openConnection();

                    connection.setRequestMethod("PUT");
                    connection.setRequestProperty(
                            "Authorization", "Bearer " + accessToken);
                    connection.setRequestProperty(
                            "Content-Type", "application/json");
                    connection.setConnectTimeout(5000);
                    connection.setReadTimeout(5000);
                    connection.setDoOutput(true);

                    try (OutputStream output = connection.getOutputStream()) {
                        output.write(body.toString().getBytes(
                                java.nio.charset.StandardCharsets.UTF_8));
                    }

                    int status = connection.getResponseCode();

                    runOnUiThread(() -> {
                        if (status == 200) {
                            Toast.makeText(this,
                                    "Item updated", Toast.LENGTH_SHORT).show();
                            finish();
                        } else {
                            saveButton.setEnabled(true);
                            Toast.makeText(this,
                                    "Update failed: " + status,
                                    Toast.LENGTH_SHORT).show();
                        }
                    });

                } catch (Exception e) {
                    runOnUiThread(() -> {
                        saveButton.setEnabled(true);
                        Toast.makeText(this,
                                "Could not update item",
                                Toast.LENGTH_SHORT).show();
                    });

                } finally {
                    if (connection != null) {
                        connection.disconnect();
                    }
                }
            }).start();

        } catch (Exception e) {
            saveButton.setEnabled(true);
            Toast.makeText(this,
                    "Invalid item data", Toast.LENGTH_SHORT).show();
        }
    }
}
