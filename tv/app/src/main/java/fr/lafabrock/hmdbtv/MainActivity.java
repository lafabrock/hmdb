package fr.lafabrock.hmdbtv;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/** HMDB pour Android TV : affiche le site en plein écran et confie la lecture à VLC. */
public class MainActivity extends Activity {
    private static final String SITE = "https://lafabrock.github.io/hmdb/?tv=1";
    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("https://lafabrock.github.io/hmdb")) return false;
                if (url.startsWith("smb://")) { play(url, ""); return true; }
                // liens externes (IMDb, TMDB…) : navigateur de la box s'il y en a un
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
                catch (Exception e) { toast("Pas de navigateur sur la box pour ouvrir ce lien"); }
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "HMDBTV");
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        setContentView(web);
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(SITE);
        web.requestFocus();
    }

    private void toast(final String t) {
        runOnUiThread(new Runnable() { public void run() { Toast.makeText(MainActivity.this, t, Toast.LENGTH_LONG).show(); } });
    }

    private void play(String url, String title) { play(url, title, "org.videolan.vlc"); }

    private void play(String url, String title, String pkg) {
        Uri uri = Uri.parse(url);
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(uri, "video/*");
        i.setPackage(pkg);
        if (title != null && title.length() > 0) i.putExtra("title", title);
        try {
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            i.setPackage(null);
            try { startActivity(Intent.createChooser(i, "Lire avec…")); }
            catch (Exception e2) { toast("Aucun lecteur vidéo ne peut ouvrir ce fichier"); }
        }
    }

    class Bridge {
        @JavascriptInterface
        public void play(final String url, final String title) {
            runOnUiThread(new Runnable() { public void run() { MainActivity.this.play(url, title); } });
        }

        @JavascriptInterface
        public void playWith(final String url, final String title, final String pkg) {
            runOnUiThread(new Runnable() { public void run() { MainActivity.this.play(url, title, pkg); } });
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            web.evaluateJavascript("(window.hmdbBack&&window.hmdbBack())?'1':'0'", new ValueCallback<String>() {
                public void onReceiveValue(String v) {
                    if (v == null || !v.contains("1")) finish();
                }
            });
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }
}
