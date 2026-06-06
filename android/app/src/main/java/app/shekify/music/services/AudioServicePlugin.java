package app.shekify.music.services;

import android.content.Intent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.IntentFilter;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioService")
public class AudioServicePlugin extends Plugin {

    @Override
    public void load() {
        super.load();
        IntentFilter filter = new IntentFilter("app.shekify.music.TRACK_COMPLETE");
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ? Context.RECEIVER_EXPORTED : 0;
        getContext().registerReceiver(new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                notifyListeners("trackComplete", new JSObject());
            }
        }, filter, flags);
    }

    @PluginMethod
    public void startPlayback(PluginCall call) {
        String trackUrl = call.getString("trackUrl");
        String title = call.getString("title");
        String artist = call.getString("artist");

        Intent intent = new Intent(getContext(), AudioService.class);
        intent.setAction("PLAY");
        intent.putExtra("trackUrl", trackUrl);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);

        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        Intent intent = new Intent(getContext(), AudioService.class);
        intent.setAction("PAUSE");
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        Intent intent = new Intent(getContext(), AudioService.class);
        intent.setAction("RESUME");
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), AudioService.class);
        intent.setAction("STOP");
        getContext().startService(intent);
        call.resolve();
    }
}
