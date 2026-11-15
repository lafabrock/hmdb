/**
 * HMDB – API de synchronisation (Google Apps Script)
 * À coller dans le Google Sheet « HMDB – base films famille » :
 * Extensions > Apps Script, puis Déployer > Nouveau déploiement > Application Web
 * (Exécuter en tant que : moi ; Qui a accès : Tout le monde).
 *
 * Onglets attendus :
 *  - Statuts      : Clé | Titre | Statut | Par | Date
 *  - Demandes     : ID | Titre | Titre original | Année | TMDB | Affiche | Demandé par | Date | Statut | Note
 *  - Utilisateurs : Code | Nom | Rôle (admin ou famille)
 */

var REQ_STATUSES = ['demande', 'encours', 'dispo', 'refuse'];
var FILM_STATUSES = ['vu', 'avoir', 'non'];

function sheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function user_(code) {
  if (!code) return null;
  var rows = sheet_('Utilisateurs').getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(code).trim()) {
      return { nom: String(rows[i][1]), role: String(rows[i][2] || 'famille').trim() };
    }
  }
  return null;
}

function load_() {
  var statuts = {};
  var s = sheet_('Statuts').getDataRange().getValues();
  for (var i = 1; i < s.length; i++) {
    if (s[i][0]) statuts[String(s[i][0])] = { s: String(s[i][2]), par: String(s[i][3]), date: String(s[i][4]) };
  }
  var demandes = [];
  var d = sheet_('Demandes').getDataRange().getValues();
  for (var j = 1; j < d.length; j++) {
    if (!d[j][0]) continue;
    demandes.push({
      id: String(d[j][0]), titre: String(d[j][1]), orig: String(d[j][2]), annee: String(d[j][3]),
      tmdb: String(d[j][4]), affiche: String(d[j][5]), par: String(d[j][6]),
      date: String(d[j][7]), statut: String(d[j][8]), note: String(d[j][9])
    });
  }
  return { statuts: statuts, demandes: demandes };
}

function today_() {
  return Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
}

function doGet(e) {
  var u = user_(e.parameter.code);
  if (!u) return json_({ ok: false, error: 'code' });
  var data = load_();
  return json_({ ok: true, user: u, statuts: data.statuts, demandes: data.demandes });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'json' }); }
  var u = user_(body.code);
  if (!u) return json_({ ok: false, error: 'code' });
  var admin = u.role === 'admin';
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (body.action === 'setStatus') {
      var key = String(body.key || '');
      if (!key) return json_({ ok: false, error: 'key' });
      var st = String(body.statut || '');
      if (st && FILM_STATUSES.indexOf(st) < 0) return json_({ ok: false, error: 'statut' });
      var sh = sheet_('Statuts');
      var rows = sh.getDataRange().getValues();
      var row = -1;
      for (var i = 1; i < rows.length; i++) if (String(rows[i][0]) === key) { row = i + 1; break; }
      if (!st) { if (row > 0) sh.deleteRow(row); }
      else if (row > 0) sh.getRange(row, 3, 1, 3).setValues([[st, u.nom, today_()]]);
      else sh.appendRow([key, String(body.titre || ''), st, u.nom, today_()]);
      return json_({ ok: true });
    }

    if (body.action === 'addRequest') {
      var titre = String(body.titre || '').slice(0, 200);
      if (!titre) return json_({ ok: false, error: 'titre' });
      var id = Utilities.getUuid().slice(0, 8);
      sheet_('Demandes').appendRow([id, titre, String(body.orig || '').slice(0, 200), String(body.annee || ''),
        String(body.tmdb || ''), String(body.affiche || ''), u.nom, today_(), 'demande', String(body.note || '').slice(0, 300)]);
      return json_({ ok: true, id: id });
    }

    if (body.action === 'updateRequest' || body.action === 'deleteRequest') {
      var dsh = sheet_('Demandes');
      var drows = dsh.getDataRange().getValues();
      for (var j = 1; j < drows.length; j++) {
        if (String(drows[j][0]) !== String(body.id)) continue;
        var owner = String(drows[j][6]) === u.nom;
        if (body.action === 'deleteRequest') {
          if (!admin && !(owner && String(drows[j][8]) === 'demande')) return json_({ ok: false, error: 'droits' });
          dsh.deleteRow(j + 1);
          return json_({ ok: true });
        }
        if (!admin) return json_({ ok: false, error: 'droits' });
        if (REQ_STATUSES.indexOf(String(body.statut)) < 0) return json_({ ok: false, error: 'statut' });
        dsh.getRange(j + 1, 9).setValue(String(body.statut));
        return json_({ ok: true });
      }
      return json_({ ok: false, error: 'introuvable' });
    }

    return json_({ ok: false, error: 'action' });
  } finally {
    lock.releaseLock();
  }
}
