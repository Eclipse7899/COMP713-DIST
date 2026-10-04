package nz.ac.aut.stocked;

import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends AppCompatActivity {

    private static final String HEALTH_URL = "http://10.0.2.2:3000/health";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        TextView textView = findViewById(R.id.textView);

        new Thread(() -> {
            try {
                URL url = new URL(HEALTH_URL);
                HttpURLConnection connection =
                        (HttpURLConnection) url.openConnection();

                connection.setRequestMethod("GET");

                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getInputStream())
                );

                String response = reader.readLine();

                reader.close();
                connection.disconnect();

                runOnUiThread(() -> textView.setText(response));

            } catch (Exception e) {
                runOnUiThread(() ->
                        textView.setText("Connection failed: " + e.getMessage())
                );
            }
        }).start();
    }
}