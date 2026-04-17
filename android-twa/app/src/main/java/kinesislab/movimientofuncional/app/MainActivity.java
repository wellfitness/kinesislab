package kinesislab.movimientofuncional.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;

public class MainActivity extends Activity {

    private static final String ASSET_BASE = "file:///android_asset/";
    private static final int SPLASH_MIN_DURATION_MS = 900;
    private static final int SPLASH_FADE_MS = 320;

    private WebView webView;
    private ImageView splashView;
    private boolean splashDismissed = false;
    private long splashStartedAt = 0L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        WebView.setWebContentsDebuggingEnabled(true);

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

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                if (url.startsWith("file:///") && !url.startsWith(ASSET_BASE)) {
                    view.loadUrl(ASSET_BASE + "dashboard.html");
                    return true;
                }

                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                String js = "var link = document.createElement('link');"
                    + "link.rel = 'stylesheet';"
                    + "link.href = 'file:///android_asset/fonts/local-fonts.css';"
                    + "document.head.insertBefore(link, document.head.firstChild);";
                view.evaluateJavascript(js, null);

                if (url.startsWith(ASSET_BASE + "dashboard.html")) {
                    scheduleSplashDismiss();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient());

        setImmersive();
        splashStartedAt = System.currentTimeMillis();
        webView.loadUrl(ASSET_BASE + "dashboard.html");
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
        webView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        setImmersive();
    }
}
