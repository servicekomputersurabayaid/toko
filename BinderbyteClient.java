import okhttp3.*;
import java.io.IOException;

public class BinderbyteClient {
    public static void main(String[] args) {
        // Inisialisasi Client
        OkHttpClient client = new OkHttpClient().newBuilder()
                .build();

        // Membuat Request GET ke API Binderbyte
        Request request = new Request.Builder()
                .url("https://api.binderbyte.com/wilayah/provinsi?api_key=76621a8a88754fd7456217c4c3d76e671624c49a76ea104047e8c1ac8ba4f030")
                .get() // Menggunakan method GET standar
                .build();

        // Eksekusi Request
        try (Response response = client.newCall(request).execute()) {
            if (response.isSuccessful() && response.body() != null) {
                // Cetak hasil JSON ke console
                System.out.println(response.body().string());
            } else {
                System.out.println("Request Gagal: " + response.code() + " " + response.message());
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}