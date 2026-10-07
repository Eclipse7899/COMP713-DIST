package nz.ac.aut.stocked;

import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

import android.content.Intent;

public class MainActivity extends AppCompatActivity {

    private static final String LOGIN_URL =
            "http://10.0.2.2:3000/api/auth/login";

    private static final String USER_URL =
            "http://10.0.2.2:3000/api/users/me";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        EditText emailInput = findViewById(R.id.emailInput);
        EditText passwordInput = findViewById(R.id.passwordInput);
        Button loginButton = findViewById(R.id.loginButton);
        TextView statusText = findViewById(R.id.statusText);

        loginButton.setOnClickListener(v -> {

            String email = emailInput.getText().toString().trim();
            String password = passwordInput.getText().toString();

            // Basic client-side validation
            if (email.isEmpty() || password.isEmpty()) {
                statusText.setText("Please enter your email and password.");
                return;
            }

            statusText.setText("Logging in...");
            loginButton.setEnabled(false);

            new Thread(() ->
                    login(email, password, statusText, loginButton)
            ).start();
        });
    }

    private void login(
            String email,
            String password,
            TextView statusText,
            Button loginButton
    ) {

        HttpURLConnection connection = null;

        try {
            URL url = new URL(LOGIN_URL);
            connection = (HttpURLConnection) url.openConnection();

            connection.setRequestMethod("POST");
            connection.setRequestProperty(
                    "Content-Type",
                    "application/json"
            );
            connection.setDoOutput(true);

            JSONObject loginBody = new JSONObject();
            loginBody.put("email", email);
            loginBody.put("password", password);

            byte[] body = loginBody.toString()
                    .getBytes(StandardCharsets.UTF_8);

            try (OutputStream outputStream =
                         connection.getOutputStream()) {
                outputStream.write(body);
            }

            int responseCode = connection.getResponseCode();

            if (responseCode == 200) {

                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(
                                connection.getInputStream()
                        )
                );

                StringBuilder response = new StringBuilder();
                String line;

                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }

                reader.close();

                JSONObject json =
                        new JSONObject(response.toString());

                String accessToken =
                        json.getString("accessToken");

                loadCurrentUser(
                        accessToken,
                        statusText,
                        loginButton
                );

            } else {
                runOnUiThread(() -> {
                    statusText.setText(
                            "Invalid email or password."
                    );
                    loginButton.setEnabled(true);
                });
            }

        } catch (Exception e) {
            runOnUiThread(() -> {
                statusText.setText(
                        "Unable to connect to Stocked."
                );
                loginButton.setEnabled(true);
            });

        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private void loadCurrentUser(
            String accessToken,
            TextView statusText,
            Button loginButton
    ) {

        HttpURLConnection connection = null;

        try {
            URL url = new URL(USER_URL);
            connection = (HttpURLConnection) url.openConnection();

            connection.setRequestMethod("GET");
            connection.setRequestProperty(
                    "Authorization",
                    "Bearer " + accessToken
            );

            int responseCode = connection.getResponseCode();

            if (responseCode == 200) {

                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(
                                connection.getInputStream()
                        )
                );

                StringBuilder response = new StringBuilder();
                String line;

                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }

                reader.close();

                JSONObject currentUser =
                        new JSONObject(response.toString());

                String username =
                        currentUser.getString("username");

                runOnUiThread(() -> {
                    Intent intent = new Intent(
                            MainActivity.this,
                            HomeActivity.class
                    );

                    intent.putExtra("username", username);
                    intent.putExtra("accessToken", accessToken);
                    startActivity(intent);
                    finish();
                });

            } else {
                runOnUiThread(() -> {
                    statusText.setText(
                            "Could not load user account."
                    );
                    loginButton.setEnabled(true);
                });
            }

        } catch (Exception e) {
            runOnUiThread(() -> {
                statusText.setText(
                        "Could not load user account."
                );
                loginButton.setEnabled(true);
            });

        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
}