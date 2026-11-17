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
 *  - Vidéothèque  : rempli automatiquement par le script de scan du PC (ne pas modifier à la main)
 *  - Corrections  : Titre détecté | Titre corrigé | Année | Catégorie | Saga | Ignorer (oui)
 * Le fichier Parse.gs (même projet) contient la reconnaissance des titres.
 */

var REQ_STATUSES = ['demande', 'encours', 'dispo', 'refuse'];
var FILM_STATUSES = ['vu', 'avoir', 'non', 'encours'];

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
  var fiches = {};
  var fs = SpreadsheetApp.getActive().getSheetByName('Fiches');
  if (fs) fs.getDataRange().getValues().slice(1).forEach(function (r) { if (r[0] && r[1]) fiches[String(r[0])] = String(r[1]); });
  return { statuts: statuts, demandes: demandes, fiches: fiches };
}

function today_() {
  return Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
}

function sheetOrCreate_(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); sh.setFrozenRows(1); }
  return sh;
}

/** Demandes en attente dont le film vient d'arriver au scan : passées à « Disponible ». */
function fulfilRequests_(lib) {
  var sh = sheet_('Demandes'), rows = sh.getDataRange().getValues(), idx = {}, n = 0;
  lib.forEach(function (r) { var k = hmdbNorm(r[0]); (idx[k] = idx[k] || []).push(+r[1] || 0); });
  for (var i = 1; i < rows.length; i++) {
    var stt = String(rows[i][8]);
    if (stt !== 'demande' && stt !== 'encours') continue;
    var y = +rows[i][3] || 0, hit = false;
    [rows[i][1], rows[i][2]].forEach(function (t) {
      (idx[hmdbNorm(t || '')] || []).forEach(function (ly) { if (!y || !ly || Math.abs(ly - y) <= 1) hit = true; });
    });
    if (hit && hmdbNorm(rows[i][1] || '')) { sh.getRange(i + 1, 9).setValue('dispo'); n++; }
  }
  return n;
}

function corrections_() {
  var sh = sheetOrCreate_('Corrections', ['Titre détecté', 'Titre corrigé', 'Année', 'Catégorie', 'Saga', 'Ignorer (oui)']);
  var rows = sh.getDataRange().getValues(), c = {};
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var ign = String(rows[i][5]).trim().toLowerCase() === 'oui';
    c[hmdbNorm(rows[i][0])] = ign ? [null] : [String(rows[i][1] || rows[i][0]), +rows[i][2] || 0, String(rows[i][3] || ''), String(rows[i][4] || '')];
  }
  return c;
}

function library_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('lib');
  if (hit) return JSON.parse(hit);
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Vidéothèque');
  var res = { library: [], updated: PropertiesService.getScriptProperties().getProperty('scanDate') || '' };
  if (sh) {
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) if (rows[i][0]) res.library.push([String(rows[i][0]), +rows[i][1] || 0, String(rows[i][2]), String(rows[i][3]), String(rows[i][4]), +rows[i][5] || 0, String(rows[i][6] || ''), +rows[i][7] || 0, +rows[i][8] || 0, +rows[i][9] || 0]);
  }
  try { cache.put('lib', JSON.stringify(res), 21600); } catch (err) {}
  return res;
}

function doGet(e) {
  if (e.parameter.action === 'paths') {
    if (!user_(e.parameter.code)) return json_({ ok: false, error: 'code' });
    var ps = SpreadsheetApp.getActive().getSheetByName('Chemins'), map = {};
    if (ps && ps.getLastRow() > 1) ps.getRange(2, 1, ps.getLastRow() - 1, Math.min(5, ps.getMaxColumns())).getValues().forEach(function (r) {
      var k = r[0] + '|' + (+r[1] || 0); (map[k] = map[k] || []).push([String(r[2]), String(r[3]), String(r[4] || '')]);
    });
    return json_({ ok: true, paths: map });
  }
  if (e.parameter.action === 'library') { var l = library_(); return json_({ ok: true, library: l.library, updated: l.updated }); }
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
    // Correction manuelle de la fiche TMDB d'un titre (partagée par toute la famille)
    if (body.action === 'setMatch') {
      var mk = String(body.key || ''), ref = String(body.ref || '');
      if (!mk || (ref && !/^(tv|movie):\d+$/.test(ref))) return json_({ ok: false, error: 'ref' });
      var fsh = sheetOrCreate_('Fiches', ['Clé (titre|année)', 'Fiche TMDB', 'Par', 'Date']);
      var fr = fsh.getDataRange().getValues(), at = -1;
      for (var q = 1; q < fr.length; q++) if (String(fr[q][0]) === mk) { at = q + 1; break; }
      if (!ref) { if (at > 0) fsh.deleteRow(at); }
      else if (at > 0) fsh.getRange(at, 2, 1, 3).setValues([[ref, u.nom, today_()]]);
      else fsh.appendRow([mk, ref, u.nom, today_()]);
      return json_({ ok: true });
    }

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

    if (body.action === 'scan') {
      if (!admin) return json_({ ok: false, error: 'droits' });
      var lib = hmdbBuildLibrary(body.files || [], corrections_());
      if (!lib.length) return json_({ ok: false, error: 'aucun titre reconnu : rien n\'a été modifié' });
      var HEAD = ['Titre', 'Année', 'Catégorie', 'Saga', 'Emplacement', 'Ajouté (horodatage)', 'Langues', 'Go WD', 'Go Whale', 'Fichiers WD'];
      var vs = sheetOrCreate_('Vidéothèque', HEAD);
      if (vs.getMaxColumns() < HEAD.length) vs.insertColumnsAfter(vs.getMaxColumns(), HEAD.length - vs.getMaxColumns());
      vs.getRange(1, 1, 1, HEAD.length).setValues([HEAD]);
      vs.getRange(2, 1, Math.max(vs.getMaxRows() - 1, 1), HEAD.length).clearContent();
      if (lib.length) {
        if (vs.getMaxRows() < lib.length + 1) vs.insertRowsAfter(vs.getMaxRows(), lib.length + 1 - vs.getMaxRows());
        // complète chaque ligne à 10 colonnes (au cas où Parse.gs serait une ancienne version)
        vs.getRange(2, 1, lib.length, HEAD.length).setValues(lib.map(function (r) { var x = r.slice(0, HEAD.length); while (x.length < HEAD.length) x.push(''); return x; }));
      }
      var dispo = fulfilRequests_(lib);
      // Chemins des fichiers (privé : servi uniquement avec un code famille, onglet masqué)
      var cs = sheetOrCreate_('Chemins', ['Titre', 'Année', 'Racine', 'Chemin', 'Sous-titres']);
      if (cs.getMaxColumns() < 5) cs.insertColumnsAfter(cs.getMaxColumns(), 5 - cs.getMaxColumns());
      cs.getRange(1, 1, 1, 5).setValues([['Titre', 'Année', 'Racine', 'Chemin', 'Sous-titres']]);
      cs.getRange(2, 1, Math.max(cs.getMaxRows() - 1, 1), 5).clearContent();
      var pth = lib.paths || [];
      if (pth.length) {
        if (cs.getMaxRows() < pth.length + 1) cs.insertRowsAfter(cs.getMaxRows(), pth.length + 1 - cs.getMaxRows());
        cs.getRange(2, 1, pth.length, 5).setValues(pth.map(function (r) { var x = r.slice(0, 5); while (x.length < 5) x.push(''); return x; }));
      }
      try { cs.hideSheet(); } catch (err) {}
      var stamp = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd HH:mm');
      PropertiesService.getScriptProperties().setProperty('scanDate', stamp);
      CacheService.getScriptCache().remove('lib');
      return json_({ ok: true, titres: lib.length, fichiers: (body.files || []).length, date: stamp, dispo: dispo });
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
