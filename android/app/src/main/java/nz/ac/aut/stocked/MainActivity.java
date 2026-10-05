package nz.ac.aut.stocked;

import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends AppCompatActivity {

    private static final String LOGIN_URL =
            "http://10.0.2.2:3000/api/auth/login";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        TextView textView = findViewById(R.id.textView);
        textView.setText("Logging in...");

        new Thread(() -> {
            try {
                URL url = new URL(LOGIN_URL);
                HttpURLConnection connection =
                        (HttpURLConnection) url.openConnection();

                connection.setRequestMethod("POST");
                connection.setRequestProperty(
                        "Content-Type",
                        "application/json"
                );
                connection.setDoOutput(true);

                JSONObject loginBody = new JSONObject();
                loginBody.put("email", "jon@example.com");
                loginBody.put("password", "123");

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

                    URL userUrl = new URL(
                            "http://10.0.2.2:3000/api/users/me"
                    );

                    HttpURLConnection userConnection =
                            (HttpURLConnection) userUrl.openConnection();

                    userConnection.setRequestMethod("GET");
                    userConnection.setRequestProperty(
                            "Authorization",
                            "Bearer " + accessToken
                    );

                    int userResponseCode =
                            userConnection.getResponseCode();

                    if (userResponseCode == 200) {

                        BufferedReader userReader = new BufferedReader(
                                new InputStreamReader(
                                        userConnection.getInputStream()
                                )
                        );

                        StringBuilder userResponse =
                                new StringBuilder();

                        String userLine;

                        while ((userLine = userReader.readLine()) != null) {
                            userResponse.append(userLine);
                        }

                        userReader.close();

                        JSONObject currentUser =
                                new JSONObject(userResponse.toString());

                        String currentUsername =
                                currentUser.getString("username");

                        String currentEmail =
                                currentUser.getString("email");

                        runOnUiThread(() ->
                                textView.setText(
                                        "Authenticated!\n\n" +
                                                "Username: " + currentUsername + "\n" +
                                                "Email: " + currentEmail
                                )
                        );

                    } else {
                        runOnUiThread(() ->
                                textView.setText(
                                        "Authenticated request failed\nHTTP " +
                                                userResponseCode
                                )
                        );
                    }

                    userConnection.disconnect();

                } else {
                    runOnUiThread(() ->
                            textView.setText(
                                    "Login failed\nHTTP " +
                                            responseCode
                            )
                    );
                }

                connection.disconnect();

            } catch (Exception e) {
                runOnUiThread(() ->
                        textView.setText(
                                "Login error:\n" + e.getMessage()
                        )
                );
            }
        }).start();
    }
}