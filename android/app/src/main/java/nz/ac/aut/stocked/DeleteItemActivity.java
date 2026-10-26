
package nz.ac.aut.stocked;

import android.os.Bundle;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.Spinner;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;

public class DeleteItemActivity extends AppCompatActivity {

    private Spinner itemSpinner;
    private TextView deleteItemStatus;
    private Button deleteItemButton;

    private ArrayList<String> itemIds = new ArrayList<>();
    private String accessToken;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_delete_item);

        itemSpinner = findViewById(R.id.itemSpinner);
        deleteItemStatus = findViewById(R.id.deleteItemStatus);
        deleteItemButton = findViewById(R.id.deleteItemButton);

        accessToken = getIntent().getStringExtra("accessToken");

        // Disable deletion until the items have loaded
        deleteItemButton.setEnabled(false);


        deleteItemButton.setOnClickListener(v -> {
            int position = itemSpinner.getSelectedItemPosition();

            if (position < 0 || position >= itemIds.size()) {
                deleteItemStatus.setText("Please select an item.");
                return;
            }

            String itemId = itemIds.get(position);

            deleteItemButton.setEnabled(false);
            deleteItemStatus.setText("Deleting item...");

            new Thread(() -> deleteItem(itemId)).start();
        });


        if (accessToken != null) {
            deleteItemStatus.setText("Loading pantry items...");
            new Thread(this::loadItems).start();
        } else {
            deleteItemStatus.setText("Please log in again.");
        }
    }

    private void loadItems() {
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

            if (connection.getResponseCode() != 200) {
                runOnUiThread(() ->
                        deleteItemStatus.setText("Could not load pantry items.")
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

            JSONArray items = new JSONArray(response.toString());

            ArrayList<String> itemNames = new ArrayList<>();
            ArrayList<String> ids = new ArrayList<>();

            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);
                JSONObject food = item.getJSONObject("food");

                String name = food.getString("name");
                String quantity = item.getString("quantity");
                String unit = item.getString("unit");

                itemNames.add(name + " - " + quantity + " " + unit);
                ids.add(item.getString("id"));
            }

            runOnUiThread(() -> {
                itemIds = ids;

                ArrayAdapter<String> adapter = new ArrayAdapter<>(
                        this,
                        android.R.layout.simple_spinner_item,
                        itemNames
                ) {
                    @Override
                    public android.view.View getView(
                            int position,
                            android.view.View convertView,
                            android.view.ViewGroup parent) {

                        TextView view = (TextView) super.getView(
                                position, convertView, parent
                        );
                        view.setTextColor(android.graphics.Color.WHITE);
                        return view;
                    }
                };

                adapter.setDropDownViewResource(
                        android.R.layout.simple_spinner_dropdown_item
                );

                itemSpinner.setAdapter(adapter);

                if (itemNames.isEmpty()) {
                    deleteItemStatus.setText("Your pantry is empty.");
                } else {
                    deleteItemStatus.setText("");
                    deleteItemButton.setEnabled(true);
                }
            });

        } catch (Exception e) {
            runOnUiThread(() ->
                    deleteItemStatus.setText("Unable to connect to Stocked.")
            );
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }


    private void deleteItem(String itemId) {
        HttpURLConnection connection = null;

        try {
            URL url = new URL("http://10.0.2.2:3000/api/items/" + itemId);
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
                        setResult(RESULT_OK);
                        finish();
                    });
                    return;
                }
            }

            runOnUiThread(() -> {
                deleteItemStatus.setText("Could not delete item. Error: " + responseCode);
                deleteItemButton.setEnabled(true);
            });

        } catch (Exception e) {
            runOnUiThread(() -> {
                deleteItemStatus.setText("Unable to delete item.");
                deleteItemButton.setEnabled(true);
            });
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

}
