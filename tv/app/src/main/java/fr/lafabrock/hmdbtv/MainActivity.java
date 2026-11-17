package fr.lafabrock.hmdbtv;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import java.util.ArrayList;
import org.json.JSONObject;
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
        else web.loadUrl(SITE + "&v=" + System.currentTimeMillis());  // toujours la dernière version du site
        web.requestFocus();
    }

    private void toast(final String t) {
        runOnUiThread(new Runnable() { public void run() { Toast.makeText(MainActivity.this, t, Toast.LENGTH_LONG).show(); } });
    }

    private static final int VOICE = 42;

    private void play(String url, String title) { play(url, title, "org.videolan.vlc", ""); }

    private void play(String url, String title, String pkg) { play(url, title, pkg, ""); }

    private void play(String url, String title, String pkg, String sub) {
        Uri uri = Uri.parse(url);
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(uri, "video/*");
        i.setPackage(pkg);
        if (title != null && title.length() > 0) i.putExtra("title", title);
        if (sub != null && sub.length() > 0) {
            i.putExtra("subtitles_location", sub);                       // VLC
            i.putExtra("subs", new Uri[] { Uri.parse(sub) });              // lecteurs compatibles MX (Nova…)
            i.putExtra("subs.enable", new Uri[] { Uri.parse(sub) });
        }
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
        public void playWithSubs(final String url, final String title, final String pkg, final String sub) {
            runOnUiThread(new Runnable() { public void run() { MainActivity.this.play(url, title, pkg, sub); } });
        }

        @JavascriptInterface
        public void voice() {
            runOnUiThread(new Runnable() { public void run() { startVoice(); } });
        }

        @JavascriptInterface
        public void playWith(final String url, final String title, final String pkg) {
            runOnUiThread(new Runnable() { public void run() { MainActivity.this.play(url, title, pkg); } });
        }
    }

    private void startVoice() {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fr-FR");
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Quel film cherches-tu ?");
        try { startActivityForResult(i, VOICE); }
        catch (Exception e) { toast("Recherche vocale indisponible sur cette box"); }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != VOICE || resultCode != RESULT_OK || data == null) return;
        ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (r == null || r.isEmpty()) return;
        web.evaluateJavascript("window.hmdbVoice&&hmdbVoice(" + JSONObject.quote(r.get(0)) + ")", null);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_SEARCH) { startVoice(); return true; }
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
        if (web != null) {
            web.onResume();
            web.evaluateJavascript("window.hmdbResume&&hmdbResume()", null);
        }
    }

    @Override
    protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }
}
