package app.shekify.music;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import app.shekify.music.services.AudioServicePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(AudioServicePlugin.class);
    }
}
