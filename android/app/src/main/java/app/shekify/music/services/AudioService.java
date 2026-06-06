package app.shekify.music.services;

import android.app.Service;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import app.shekify.music.MainActivity;
import app.shekify.music.R;

public class AudioService extends Service {

    private static final int NOTIFICATION_ID = 1;
    private static final String CHANNEL_ID = "shekify_playback";

    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private String currentTrackId;
    private String currentTrackTitle;
    private String currentArtist;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Create notification channel (Android 8+)
        createNotificationChannel();

        // Show foreground notification (REQUIRED for background audio)
        startForeground(NOTIFICATION_ID, createNotification().build());

        // Handle incoming intent
        if (intent != null) {
            String action = intent.getAction();

            if ("PLAY".equals(action)) {
                String trackUrl = intent.getStringExtra("trackUrl");
                String trackTitle = intent.getStringExtra("title");
                String trackArtist = intent.getStringExtra("artist");

                playTrack(trackUrl, trackTitle, trackArtist);
            } else if ("PAUSE".equals(action)) {
                pauseTrack();
            } else if ("RESUME".equals(action)) {
                resumeTrack();
            } else if ("STOP".equals(action)) {
                stopSelf();
            }
        }

        // Keep service alive if app is killed
        return START_STICKY;
    }

    private void playTrack(String trackUrl, String title, String artist) {
        try {
            currentTrackTitle = title;
            currentArtist = artist;

            // Release previous player
            if (mediaPlayer != null) {
                mediaPlayer.release();
            }

            // Create new MediaPlayer
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            );

            // Set data source (URL)
            mediaPlayer.setDataSource(trackUrl);

            // Prepare asynchronously
            mediaPlayer.setOnPreparedListener(mp -> {
                mp.start();
                updateNotification();
                
                // Acquire audio focus
                requestAudioFocus();
            });

            mediaPlayer.setOnCompletionListener(mp -> {
                // Track finished, notify frontend
                notifyFrontendTrackComplete();
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                // Error occurred, notify frontend
                notifyFrontendError(what, extra);
                return true;
            });

            mediaPlayer.prepareAsync();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void pauseTrack() {
        if (mediaPlayer != null && mediaPlayer.isPlaying()) {
            mediaPlayer.pause();
            updateNotification();
        }
    }

    private void resumeTrack() {
        if (mediaPlayer != null && !mediaPlayer.isPlaying()) {
            mediaPlayer.start();
            updateNotification();
        }
    }

    private void requestAudioFocus() {
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioFocusRequest focusRequest = new AudioFocusRequest.Builder(
                AudioManager.AUDIOFOCUS_GAIN
            )
                .setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                )
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener(focusChange -> {
                    switch (focusChange) {
                        case AudioManager.AUDIOFOCUS_LOSS:
                            pauseTrack();
                            break;
                        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                            pauseTrack();
                            break;
                        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                            if (mediaPlayer != null) {
                                mediaPlayer.setVolume(0.3f, 0.3f);
                            }
                            break;
                        case AudioManager.AUDIOFOCUS_GAIN:
                            if (mediaPlayer != null) {
                                mediaPlayer.setVolume(1f, 1f);
                                resumeTrack();
                            }
                            break;
                    }
                })
                .build();

            audioManager.requestAudioFocus(focusRequest);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Music Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shekify music playback notifications");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    private NotificationCompat.Builder createNotification() {
        Intent mainIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, mainIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        boolean isPlaying = mediaPlayer != null && mediaPlayer.isPlaying();

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher_round) // Using standard mipmap icon
            .setContentTitle(currentTrackTitle != null ? currentTrackTitle : "Now Playing")
            .setContentText(currentArtist != null ? currentArtist : "Shekify")
            .setContentIntent(pendingIntent)
            .setStyle(new MediaStyle()
                .setShowActionsInCompactView(0, 1, 2)
            )
            .addAction(android.R.drawable.ic_media_previous, "Previous", 
                getPendingIntent("PREVIOUS"))
            .addAction(
                isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                isPlaying ? "Pause" : "Play",
                getPendingIntent(isPlaying ? "PAUSE" : "RESUME")
            )
            .addAction(android.R.drawable.ic_media_next, "Next", 
                getPendingIntent("NEXT"))
            .setOngoing(true);
    }

    private void updateNotification() {
        NotificationManager manager = 
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.notify(NOTIFICATION_ID, createNotification().build());
    }

    private PendingIntent getPendingIntent(String action) {
        Intent intent = new Intent(this, AudioService.class);
        intent.setAction(action);
        return PendingIntent.getService(
            this, action.hashCode(), intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private void notifyFrontendTrackComplete() {
        Intent intent = new Intent("app.shekify.music.TRACK_COMPLETE");
        sendBroadcast(intent);
    }

    private void notifyFrontendError(int what, int extra) {
        // Send error to JavaScript layer (advanced implementation)
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (mediaPlayer != null) {
            mediaPlayer.release();
            mediaPlayer = null;
        }
    }
}
