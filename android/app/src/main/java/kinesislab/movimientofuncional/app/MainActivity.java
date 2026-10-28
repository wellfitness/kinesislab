package kinesislab.movimientofuncional.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.Gravity;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.json.JSONObject;

public class MainActivity extends ComponentActivity {

    private static final String APP_BASE = "https://appassets.androidplatform.net/";
    private static final String DASHBOARD_PATH = "src/herramientas/vanilla/dashboard.html";
    private static final int SPLASH_MIN_DURATION_MS = 900;
    private static final int SPLASH_FADE_MS = 320;

    private WebView webView;
    private ImageView splashView;
    private boolean splashDismissed = false;
    private long splashStartedAt = 0L;
    private AndroidTTSBridge ttsBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#000806"));

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        splashView = new ImageView(this);
        splashView.setImageResource(R.drawable.splash_logo);
        splashView.setScaleType(ImageView.ScaleType.FIT_CENTER);
        splashView.setBackgroundColor(Color.parseColor("#000806"));
        FrameLayout.LayoutParams splashParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        splashParams.gravity = Gravity.CENTER;
        root.addView(splashView, splashParams);

        setContentView(root);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        // Ignora la escala de fuente del sistema (Ajustes → Pantalla → Tamaño de fuente).
        // Sin esto, en dispositivos con fuente "grande" (típico en Realme/ColorOS y en
        // móviles de personas mayores) los textos crecen pero los contenedores en px no,
        // descuadrando todo el layout. La app define su propia tipografía accesible.
        settings.setTextZoom(100);

        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                if (url.startsWith(APP_BASE)) {
                    return false;
                }

                try {
                    Intent browser = new Intent(Intent.ACTION_VIEW, request.getUrl());
                    browser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(browser);
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url.endsWith("/dashboard.html")) {
                    scheduleSplashDismiss();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient());

        ttsBridge = new AndroidTTSBridge(this, webView);
        webView.addJavascriptInterface(ttsBridge, "AndroidTTS");

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        setImmersive();
        splashStartedAt = System.currentTimeMillis();
        webView.loadUrl(APP_BASE + DASHBOARD_PATH);
    }

    @Override
    protected void onPause() {
        if (ttsBridge != null) {
            ttsBridge.cancel();
        }
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
        }
        setImmersive();
    }

    @Override
    protected void onDestroy() {
        if (ttsBridge != null) {
            ttsBridge.shutdown();
            ttsBridge = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private void scheduleSplashDismiss() {
        if (splashDismissed || splashView == null) return;
        long elapsed = System.currentTimeMillis() - splashStartedAt;
        long remaining = Math.max(0L, SPLASH_MIN_DURATION_MS - elapsed);
        splashView.postDelayed(this::dismissSplash, remaining);
    }

    private void dismissSplash() {
        if (splashDismissed || splashView == null) return;
        splashDismissed = true;
        splashView.animate()
            .alpha(0f)
            .setDuration(SPLASH_FADE_MS)
            .setListener(new AnimatorListenerAdapter() {
                @Override
                public void onAnimationEnd(Animator animation) {
                    if (splashView != null && splashView.getParent() instanceof FrameLayout) {
                        ((FrameLayout) splashView.getParent()).removeView(splashView);
                    }
                    splashView = null;
                }
            })
            .start();
    }

    private void setImmersive() {
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
    }


    /**
     * Bridge entre JavaScript (window.AndroidTTS) y android.speech.tts.TextToSpeech.
     * Solución infalible para la síntesis de voz dentro del WebView, donde
     * window.speechSynthesis es inconsistente entre versiones/dispositivos.
     * Las herramientas (comba, boxing, clock, arrows) lo invocan a través de
     * assets/js/tts-bridge.js, que cae al Web Speech API si el bridge no existe.
     */
    private static final class AndroidTTSBridge {
        private final WebView webView;
        private TextToSpeech tts;

        // Los métodos @JavascriptInterface se ejecutan en el hilo del puente
        // JS y el arranque del motor corre en el hilo principal: las banderas
        // deben ser volatile para que no se lean obsoletas. Con `ready` leída
        // como false, cada locución se quedaría en `pending` y la voz no
        // sonaría nunca.
        private volatile boolean ready = false;
        private volatile boolean spanishAvailable = false;

        /**
         * Locales de español por orden de preferencia. es-ES primero porque la
         * aplicación está en español de España y es la voz que articula mejor
         * las instrucciones. El resto son alternativas para dispositivos que
         * solo tienen voz latinoamericana.
         */
        private static final String[] SPANISH_LOCALES = {
                "es-ES", "es", "es-MX", "es-419", "es-US"
        };

        /** Locuciones emitidas antes de que el motor terminara de arrancar. */
        private final List<PendingUtterance> pending = new ArrayList<>();
        private final Object pendingLock = new Object();

        private static final class PendingUtterance {
            final String text;
            final float rate;
            final String callbackId;

            PendingUtterance(String text, float rate, String callbackId) {
                this.text = text;
                this.rate = rate;
                this.callbackId = callbackId;
            }
        }

        AndroidTTSBridge(Context ctx, WebView webView) {
            this.webView = webView;
            this.tts = new TextToSpeech(ctx.getApplicationContext(), status -> {
                if (status != TextToSpeech.SUCCESS) return;
                spanishAvailable = applySpanishLanguage();
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String utteranceId) { /* noop */ }
                    @Override public void onDone(String utteranceId) { fireDone(utteranceId); }
                    @Override @SuppressWarnings("deprecation")
                    public void onError(String utteranceId) { fireDone(utteranceId); }
                    @Override public void onError(String utteranceId, int errorCode) { fireDone(utteranceId); }
                });
                ready = true;
                markReadyAndFlush();
            });
        }

        /**
         * Busca una voz en español entre los locales disponibles y la activa.
         *
         * Si no hay ninguna NO se recurre al idioma del dispositivo: leer el
         * texto en español con la voz del sistema es indistinguible de un
         * fallo de audio, que es justo lo que reportó la usuaria. En ese caso
         * el motor no locuta y la interfaz avisa para que instale un motor en
         * español.
         */
        private boolean applySpanishLanguage() {
            for (String tag : SPANISH_LOCALES) {
                Locale locale = Locale.forLanguageTag(tag);
                if (tts.isLanguageAvailable(locale) >= TextToSpeech.LANG_AVAILABLE) {
                    tts.setLanguage(locale);
                    return true;
                }
            }
            return false;
        }

        /**
         * Publica que el motor está listo y drena la cola en la misma sección
         * crítica. Si la publicación y el drenaje fueran independientes, una
         * locución encolada justo entre ambos quedaría varada: no sonaría y no
         * se avisaría de ello.
         */
        private void markReadyAndFlush() {
            List<PendingUtterance> queued;
            synchronized (pendingLock) {
                ready = true;
                queued = new ArrayList<>(pending);
                pending.clear();
            }
            for (PendingUtterance u : queued) {
                if (!spanishAvailable) {
                    // Sin voz en español no se locuta, pero la promesa se
                    // resuelve para que la herramienta no se quede esperando.
                    fireDone(u.callbackId);
                    continue;
                }
                tts.setSpeechRate(u.rate > 0f ? u.rate : 1.0f);
                tts.speak(u.text, TextToSpeech.QUEUE_ADD, null, u.callbackId);
            }
        }

        private void fireDone(String utteranceId) {
            if (utteranceId == null || !utteranceId.startsWith("klw_")) return;
            // El id se escapa como cadena JSON: speakWithCallback es público
            // para el WebView y una comilla sin escapar inyectaría JavaScript.
            final String quoted = JSONObject.quote(utteranceId);
            // Las llamadas a evaluateJavascript deben ocurrir en el hilo principal del WebView.
            webView.post(() -> webView.evaluateJavascript(
                "window.__androidTTSDone && window.__androidTTSDone(" + quoted + ")",
                null
            ));
        }

        /** El motor ya enlazó y se puede localizar. */
        @JavascriptInterface
        public boolean isReady() {
            return ready;
        }

        /**
         * Indica si el dispositivo tiene voz en español. Antes de que el motor
         * arranque no se sabe: la interfaz no debe dar por hecho que no la hay.
         */
        @JavascriptInterface
        public boolean isSpanishAvailable() {
            return ready && spanishAvailable;
        }

        @JavascriptInterface
        public void warmup() {
            if (!ready || tts == null || !spanishAvailable) return;
            // Locución vacía con QUEUE_FLUSH: calienta el motor sin dejar nada
            // encolado detrás de la primera instrucción real.
            tts.speak("", TextToSpeech.QUEUE_FLUSH, null, "kl_warmup");
        }

        @JavascriptInterface
        public void speak(String text, float rate) {
            if (text == null) return;
            // Comprobar y encolar bajo el mismo lock: si el motor ya está
            // listo no se encola nada, y si no lo está la locución entra en la
            // cola antes de que el hilo principal la drene.
            synchronized (pendingLock) {
                if (!ready || tts == null) {
                    // El motor todavía está arrancando. Antes la instrucción se
                    // perdía en silencio; ahora se encola y se reproduce en
                    // cuanto el motor está listo.
                    pending.add(new PendingUtterance(text, rate, "kl_pending_" + System.nanoTime()));
                    return;
                }
            }
            if (!spanishAvailable) return;
            tts.setSpeechRate(rate > 0f ? rate : 1.0f);
            tts.speak(text, TextToSpeech.QUEUE_ADD, null, "kl_" + System.nanoTime());
        }

        @JavascriptInterface
        public void speakWithCallback(String text, float rate, String callbackId) {
            if (callbackId == null) return;
            if (text == null) {
                fireDone(callbackId);
                return;
            }
            synchronized (pendingLock) {
                if (!ready || tts == null) {
                    pending.add(new PendingUtterance(text, rate, callbackId));
                    return;
                }
            }
            if (!spanishAvailable) {
                // Sin voz en español no se locuta, pero la promesa se resuelve
                // para que la secuencia de la herramienta no se bloquee.
                fireDone(callbackId);
                return;
            }
            tts.setSpeechRate(rate > 0f ? rate : 1.0f);
            // El parámetro Bundle es null porque ya pasamos utteranceId como 4º arg.
            int code = tts.speak(text, TextToSpeech.QUEUE_ADD, null, callbackId);
            if (code != TextToSpeech.SUCCESS) fireDone(callbackId);
        }

        @JavascriptInterface
        public void cancel() {
            synchronized (pendingLock) {
                pending.clear();
            }
            if (tts != null) tts.stop();
        }

        void shutdown() {
            synchronized (pendingLock) {
                pending.clear();
            }
            if (tts != null) {
                tts.stop();
                tts.shutdown();
                tts = null;
            }
            ready = false;
            spanishAvailable = false;
        }
    }
}
