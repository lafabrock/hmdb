/**
 * HMDB – reconnaissance des titres à partir des noms de fichiers.
 * Appelé par l'action « scan » de Code.gs. Ne renvoie que des titres propres :
 * les noms de fichiers bruts ne sont jamais publiés.
 */

var VIDEO_EXT = /\.(mkv|mp4|avi|m4v)$/i;
var JUNK = /(?<![\wÀ-ÿ])(2160p|1080p|1080|720p|576p|540p|480p|4k|4klight|multi|french|truefrench|vff|vf2|vfi|vfq|vof|vostfr|vf|fr|bluray|blu ray|brrip|bdrip|dvdrip|webrip|web|web dl|hdlight|hdrip|hdtv|x264|x265|h264|h265|hevc|av1|remastered|extended|custom|hybrid|ext|uncut|internal|xvid|divx|ac3|aac|dts|proper|repack|imax|director|subforced|yify|mhdgz|eng|open matte|multisub|hd ts|telesync|unrated|mutli|wawacity|wawa city|zone telechargement|ec)(?![\wÀ-ÿ])/i;
var EPISODE = /(S\d{1,2}\s?E\d{1,3}|\d+\s?of\s?\d+|^\d{1,2}\s*-\s|_t\d+$|^[A-Z]\d_t\d+$)/i;

var CAT = { "Films d'animation": 'Animation', 'Cinéma francais': 'Cinéma français', 'Film français': 'Cinéma français', "Films d'horreur": 'Horreur',
  'Documentaires': 'Documentaires', 'DOC': 'Documentaires', 'Musique': 'Documentaires', 'Humour': 'Spectacles', 'SERIES': 'Séries',
  'SCIENCE FICTION': 'Science-fiction', 'Vieux films': 'Classiques' };
var SAGA = { 'JAMES BOND': 'James Bond', 'Harry Potter': 'Harry Potter', 'MCU': 'Marvel', 'X-Men': 'X-Men', 'Batman': 'Batman', 'Batman Dark Knight Trilogy': 'Batman',
  'Mission Impossible': 'Mission Impossible', 'Star Wars': 'Star Wars', 'Pirates des caraibes': 'Pirates des Caraïbes', 'INDIANA JONES': 'Indiana Jones', 'JCVD': 'Van Damme',
  'John Wick': 'John Wick', 'La planete des singes': 'La Planète des singes', 'Les Tuche': 'Les Tuche', 'Austin Powers': 'Austin Powers', 'Monty Python': 'Monty Python',
  "Monty Python's And Now for Something Completely Different 1971 1080p-HighCode": 'Monty Python', 'Tarantino': 'Tarantino', 'Hitchcock': 'Hitchcock',
  'Cycles Paul Newman': 'Paul Newman', 'Cycle Kevin Costner': 'Kevin Costner', 'BRUCE LEE': 'Bruce Lee', 'Christopher Nolan': 'Christopher Nolan', 'Jack Black': 'Jack Black',
  'Japonais': 'Cinéma japonais', 'Jason Bourne': 'Jason Bourne', 'Jim Carrey': 'Jim Carrey', 'lE pARRAIN': 'Le Parrain', 'Le Seigneur des anneaux': 'Tolkien',
  'Louis de Funès': 'Louis de Funès', 'Martin Scorcese': 'Scorsese', 'Michel Gondry': 'Michel Gondry', "Ocean's": "Ocean's", 'Retour vers le futur': 'Retour vers le futur',
  'Sherlock Holmes': 'Sherlock Holmes', 'Superman': 'Superman' };
var SUB = { 'Pixar': 'Pixar', 'Moi moche et méchant . Les minions': 'Moi, moche et méchant', 'Shrek': 'Shrek', "L'age de glace": "L'Âge de glace", 'Madagascar': 'Madagascar',
  'Dragons': 'Dragons', 'Halloween Special': 'Halloween' };

/* Séries du dossier « Shared Séries » : nom du dossier -> [titre, année, saga] */
var SERIES = {
  'One Piece - Anime': ['One Piece', 1999, 'Animés'], 'One Piece - Live action': ['One Piece (série live)', 2023, ''], 'Dragon Ball': ['Dragon Ball', 1986, 'Animés'],
  'What if': ['What If...?', 2021, 'Marvel'], 'What.If.2021': ['What If...?', 2021, 'Marvel'], 'Sherlock.Holmes.Miyazaki.1984.h264.1080p-NOTAG': ['Sherlock Holmes (Miyazaki)', 1984, 'Animés'],
  'The Fresh Prince Of Bel-Air.1990.INTEGRALE.MULTI.1080p.WEB-DL.H265-FTMVHD': ['Le Prince de Bel-Air', 1990, ''], 'Mashle': ['Mashle', 2023, 'Animés'],
  'My.Hero.Academia.S01.MULTi.1080p.BluRay.x264-KAZETV': ['My Hero Academia', 2016, 'Animés'], 'Andor': ['Andor', 2022, 'Star Wars'],
  'Monster - S04 - The Lizzie Borden Story': ["Monster : L'Histoire de Lizzie Borden", 2025, ''], 'Mobland.S01.MULTi.1080p.WEB.H264-GL0P': ['MobLand', 2025, ''],
  '7 Bears': ['7 Bears', 2025, 'Dessins animés'], 'Pokemon': ['Pokémon', 1997, 'Animés'], 'Fairy Tail': ['Fairy Tail', 2009, 'Animés'], 'Naruto S1': ['Naruto', 2002, 'Animés'],
  'South Park': ['South Park', 1997, 'Dessins animés'], 'Recalé': ['Recalé', 0, ''], 'Surveillant': ['Surveillant', 0, ''], 'Star Wars Visions': ['Star Wars: Visions', 2021, 'Star Wars'],
  'Kidding': ['Kidding', 2018, 'Jim Carrey'], 'Astérix': ['Astérix et Obélix : Le Combat des chefs', 2025, 'Dessins animés'],
  'Jayce et les Conquérants de la lumière': ['Jayce et les Conquérants de la lumière', 1985, 'Dessins animés'], 'The Simpsons': ['Les Simpson', 1989, 'Dessins animés'],
  'Les contes de la crypte': ['Les Contes de la crypte', 1989, ''], 'Paul la série': ['Paul, la série', 0, ''], 'White Lotus': ['The White Lotus', 2021, ''],
  'Silicon.Valley.S01.720p.BRRip.MkvCage': ['Silicon Valley', 2014, ''], 'Dune.Prophecy': ['Dune : Prophecy', 2024, ''], 'Minus & Cortex': ['Minus et Cortex', 1995, 'Dessins animés'],
  'Arcane': ['Arcane', 2021, ''], 'The.Lord.Of.The.Rings.The.Rings.Of.Power': ['Le Seigneur des anneaux : Les Anneaux de pouvoir', 2022, 'Tolkien'],
  'Star.Wars.Skeleton.Crew': ['Star Wars: Skeleton Crew', 2024, 'Star Wars'], 'Shrinking': ['Shrinking', 2023, ''], 'Paxi': ['Paxi', 0, 'Dessins animés'],
  'Origins.of.Hip-Hop': ['Origins of Hip-Hop', 0, ''], 'Black Mirror': ['Black Mirror', 2011, ''], 'Bref': ['Bref', 2011, ''], 'Dark.Matter': ['Dark Matter', 2024, ''],
  'Sambre': ['Sambre', 2023, ''], 'LOL': ['LOL : Qui rit, sort !', 2021, ''], 'DB Super': ['Dragon Ball Super', 2015, 'Animés'],
  'DBZ': ['Dragon Ball Z', 1989, 'Animés'], 'Saint Seya': ['Saint Seiya : Les Chevaliers du Zodiaque', 1986, 'Animés'],
  'Full Metal Alchemist': ['Fullmetal Alchemist', 0, 'Animés'], 'Foundation': ['Fondation', 2021, ''], '3 Body Problem': ['3 Body Problem', 2024, ''],
  'Get Back': ['The Beatles: Get Back', 2021, ''], 'Lupin': ['Lupin', 2021, ''], 'Peaky Blinders': ['Peaky Blinders', 2013, ''],
  'The Last Of Us': ['The Last of Us', 2023, ''], 'Weeds': ['Weeds', 2005, ''], 'Ne montre jamais ça à personne': ['Ne montre jamais ça à personne', 2021, ''], 'Star.Wars.Forces.of.Destiny': ['Star Wars : Forces du destin', 2017, 'Star Wars']
};

/* Corrections : titre détecté (normalisé, éventuellement « |année ») -> [titre, année] ; [null] = ignorer */
var FIX = {
  'batman 1': ['Batman', 1989], 'a few good me': ['A Few Good Men', 1992], 'y a t il un flic 1 y a t il un flic pour sauver la reine': ['Y a-t-il un flic pour sauver la reine ?', 1988],
  'assassin s': ['Assassin(s)', 1997], 'la jetee chris marker': ['La Jetée', 1962], 'iron man 1': ['Iron Man', 2008], 'shrek 1': ['Shrek', 2001],
  'le seigneur des anneaux 1 la communaute de l anneau': ["Le Seigneur des anneaux : La Communauté de l'anneau", 2001],
  'le seigneur des anneaux 2 les deux tours': ['Le Seigneur des anneaux : Les Deux Tours', 2002], 'le seigneur des anneaux 3 le retour du roi': ['Le Seigneur des anneaux : Le Retour du roi', 2003],
  'les aventures du baron de munchhausen': ['Les Aventures du baron de Münchausen', 1988], 'sacre graal': ['Monty Python : Sacré Graal !', 1975],
  'monty python and the holy grail': ['Monty Python : Sacré Graal !', 1975], 'mon oncle jacques tati': ['Mon oncle', 1958],
  'indiana jones 1': ["Les Aventuriers de l'Arche perdue", 1981], 'indiana jones 2': ['Indiana Jones et le Temple maudit', 1984],
  'indiana jones 3': ['Indiana Jones et la Dernière Croisade', 1989], 'indiana jones 4': ['Indiana Jones et le Royaume du crâne de cristal', 2008],
  'harry potter 1 a l ecole des sorciers': ["Harry Potter à l'école des sorciers", 2001], 'harry potter|2001': ["Harry Potter à l'école des sorciers", 2001],
  'harry potter 2 et la chambre des secrets': ['Harry Potter et la Chambre des secrets', 2002], 'harry potter 2': ['Harry Potter et la Chambre des secrets', 2002],
  'harry potter 3 et le prisonier d azkaban': ["Harry Potter et le Prisonnier d'Azkaban", 2004], 'harry potter 3': ["Harry Potter et le Prisonnier d'Azkaban", 2004],
  'harry potter 4 et la coupe de feu': ['Harry Potter et la Coupe de feu', 2005], 'harry potter 4': ['Harry Potter et la Coupe de feu', 2005],
  'harry potter 5 et l ordre du phenix': ["Harry Potter et l'Ordre du Phénix", 2007], 'harry potter 5': ["Harry Potter et l'Ordre du Phénix", 2007],
  'harry potter 6 et le prince de sang mele': ['Harry Potter et le Prince de sang-mêlé', 2009], 'harry potter 6': ['Harry Potter et le Prince de sang-mêlé', 2009],
  'harry potter 7 et les reliques de la mort partie 1': ['Harry Potter et les Reliques de la Mort - Partie 1', 2010],
  'harry potter 8 et les reliques de la mort partie 2': ['Harry Potter et les Reliques de la Mort - Partie 2', 2011],
  'retour vers le futur 1': ['Retour vers le futur', 1985], 'retour vers le futur 2': ['Retour vers le futur 2', 1989], 'retour vers le futur 3': ['Retour vers le futur 3', 1990],
  'superman i': ['Superman', 1978], 'superman ii': ['Superman II', 1980], 'superman iii': ['Superman III', 1983], 'superman v': ['Superman Returns', 2006],
  'le parrain 1': ['Le Parrain', 1972], 'le parrain 2': ['Le Parrain, 2e partie', 1974], 'le parrain 3': ['Le Parrain, 3e partie', 1990],
  'les nul la cite de la peur': ['La Cité de la peur', 1994], 'oss 117 rio': ['OSS 117 : Rio ne répond plus', 2009], 'oss117': ["OSS 117 : Le Caire, nid d'espions", 2006],
  'certains l aiment chaud': ["Certains l'aiment chaud", 1959], 'cheriesens rajeunir': ['Chérie, je me sens rajeunir', 1952],
  'monkey business cary grant ginger rogers marilyn monroe': ['Chérie, je me sens rajeunir', 1952], 'le limier': ['Le Limier', 1972], 'sleuth': ['Le Limier', 1972],
  'le milliardaire george cukor': ['Le Milliardaire', 1960], 'the wing or the thigh': ["L'Aile ou la Cuisse", 1976], 'themanwho knew too much': ['The Man Who Knew Too Much', 1956],
  'the school of rock': ['Rock Academy', 2003], 'a beautifulthe neighborhood': ['A Beautiful Day in the Neighborhood', 2019], 'sherlock holms': ['Sherlock Holmes', 2009],
  'sherlock holmes a game of shadows': ["Sherlock Holmes : Jeu d'ombres", 2011], 'sherlock holmes jeu d ombres': ["Sherlock Holmes : Jeu d'ombres", 2011],
  '2001 l odyssee de l espace': ["2001, l'Odyssée de l'espace", 1968], '2001 a space odyssey': ["2001, l'Odyssée de l'espace", 1968],
  'h2g2 le guide du voyageur galactique': ['H2G2 : Le Guide du voyageur galactique', 2005], "the hitchhiker s guide to the galaxy": ['H2G2 : Le Guide du voyageur galactique', 2005],
  'star wars episode iv a new hope': ['Star Wars, épisode IV : Un nouvel espoir', 1977], 'daft|1999': ['Daft Punk : D.A.F.T.', 1999],
  'bbc planet earth': ['Planète Terre (BBC)', 2006], 'the blue planet': ['La Planète bleue (BBC)', 2001], "les nuls l integrule": ["Les Nuls, l'intégrule", 0],
  '01 part of the weekend never dies': ['Part of the Weekend Never Dies', 2008], '02 nite versions live at fabric': [null], '03 part of the weekend really never dies': [null],
  'dangeureusement votre': ['Dangereusement vôtre', 1985], 'dangereusement votre': ['Dangereusement vôtre', 1985], 'meurt un autre jour': ['Meurs un autre jour', 2002],
  'moon rakjer': ['Moonraker', 1979], 'vivre et laisser mourrir': ['Vivre et laisser mourir', 1973], 'menteur menteur': ['Menteur, menteur', 1997],
  'jumanji welcome to the jungle': ['Jumanji : Bienvenue dans la jungle', 2017], 'mask 1': [null],
  'le monde ne suffit pas': ['Le monde ne suffit pas', 1999], 'skyfall': ['Skyfall', 2012],
  'le gout des merveilles': ['Le Goût des merveilles', 2015, 'Cinéma français', ''], 'papa ou maman 2': ['Papa ou maman 2', 2016, 'Cinéma français', ''],
  'shrek': ['Shrek', 2001, 'Animation', 'Shrek'], 'shrek 2': ['Shrek 2', 2004, 'Animation', 'Shrek'], 'shrek 3': ['Shrek le troisième', 2007, 'Animation', 'Shrek'],
  'shrek 4': ['Shrek 4 : Il était une fin', 2010, 'Animation', 'Shrek'], 'rio 2': ['Rio 2', 2014, 'Animation', '']
};
var RULES = [
  [/^StarWars\s*Ep0?1\b/i, 'Star Wars - Épisode I - La Menace fantôme', 1999], [/^StarWars\s*Ep0?2\b/i, "Star Wars, épisode II : L'Attaque des clones", 2002],
  [/^StarWars\s*Ep0?3\b/i, 'Star Wars, épisode III : La Revanche des Sith', 2005], [/^StarWars\s*Ep0?4\b/i, 'Star Wars, épisode IV : Un nouvel espoir', 1977],
  [/^StarWars\s*Ep0?5\b/i, "L'Empire contre-attaque", 1980], [/^StarWars\s*Ep0?6\b/i, 'Star Wars, épisode VI : Le Retour du Jedi', 1983]
];

function hmdbNorm(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function hmdbClean(base) {
  var b = base.replace(VIDEO_EXT, '');
  b = b.replace(/^\s*\[[^\]]*\]\s*/, '').replace(/\[#\d+\]/g, '');
  if (/l&/i.test(b)) b = b.replace(/&/g, "'");
  b = b.replace(/[._+]+/g, ' ').replace(/\s+/g, ' ').trim();
  for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(b)) return [RULES[i][1], RULES[i][2]];
  var m = b.match(/^(?:Bruce Lee|Asterix \(Film\))\s*-\s*(\d{4})\s*-\s*(.+?)\s*-\s*\d{3,4}p/i);
  if (m) return [m[2], +m[1]];
  var j = b.search(JUNK), head = j >= 0 ? b.slice(0, j) : b;
  head = head.replace(/[\[\(]\s*$/, '').trim();
  var re = /(^|[^\d])(19[2-9]\d|20[0-2]\d)(?!\d)/g, x, last = null;
  while ((x = re.exec(head)) !== null) { if (x.index + x[1].length > 0) last = { i: x.index + x[1].length, y: +x[2] }; }
  var y = 0;
  if (last) { y = last.y; head = head.slice(0, last.i); }
  else if (j >= 0) { var t = b.slice(j).match(/(^|[^\d])(19[2-9]\d|20[0-2]\d)(?!\d)/); if (t) y = +t[2]; }
  head = head.replace(/[\(\[]\s*$/, '').replace(/\s*[-–(\[]+\s*$/, '').replace(/^[-\s]+|[-\s]+$/g, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  head = head.replace(/^Hitchcock\s*-\s*/i, '').replace(/^\d+-(?=\D)/, '').replace(/\s*-\s*Jacques Tati$/i, '');
  if (head === head.toLowerCase()) head = head.charAt(0).toUpperCase() + head.slice(1);
  return [head, y];
}

function hmdbFix(t, y, corr) {
  var n = hmdbNorm(t), k = n + '|' + (y || '');
  var c = corr[k] || corr[n] || FIX[k] || FIX[n];
  if (!c) return [t, y, null];
  if (c[0] === null) return null;
  return [c[0], c[1] || y, c];
}

/**
 * files : [{r:'Z'|'S'|'W'|'T', p:'chemin/relatif', s:taille, m:mtime ms}]
 * corr  : corrections de l'onglet « Corrections » {clé normalisée: [titre|null, année, catégorie, saga]}
 * Renvoie des lignes [titre, année, catégorie, saga, emplacement, ajouté (s)].
 */
function hmdbBuildLibrary(files, corr) {
  corr = corr || {};
  var vids = files.filter(function (f) {
    var base = f.p.split('/').pop();
    return VIDEO_EXT.test(base) && base.charAt(0) !== '.' && f.s > 15e6;
  });
  // dossiers à regrouper (épisodes)
  var byDir = {};
  vids.forEach(function (f) { var d = f.r + ':' + f.p.split('/').slice(0, -1).join('/'); (byDir[d] = byDir[d] || []).push(f); });
  var collapse = {};
  Object.keys(byDir).forEach(function (d) {
    var list = byDir[d], dir = d.split(':').slice(1).join(':');
    if (!dir) return;
    var ep = list.filter(function (f) { var bb = f.p.split('/').pop().replace(VIDEO_EXT, ''); return EPISODE.test(bb) || EPISODE.test(bb.replace(/[._+]+/g, ' ')); }).length;
    if (list.length >= 4 && ep / list.length >= 0.6) collapse[d] = true;
  });
  var out = {}, order = [];
  function add(t, y, cat, saga, loc, m) {
    var n = hmdbNorm(t), hit = null;
    for (var i = 0; i < order.length; i++) {
      var o = out[order[i]];
      if (o.n === n && (!y || !o.y || o.y === y)) { hit = o; break; }
    }
    if (hit) {
      if (hit.loc.indexOf(loc) < 0) hit.loc = (hit.loc + loc).split('').sort().reverse().join('');
      hit.y = hit.y || y; hit.cat = hit.cat || cat; hit.saga = hit.saga || saga; hit.m = Math.max(hit.m, m);
      return hit;
    }
    var key = n + '|' + y; out[key] = { n: n, t: t, y: y, cat: cat, saga: saga, loc: loc, m: m, paths: [] }; order.push(key);
    return out[key];
  }
  var seenSeries = {};
  function keep(o, f) { if (o && (f.r === 'Z' || f.r === 'S')) o.paths.push([f.r, f.p]); }
  vids.forEach(function (f) {
    var parts = f.p.split('/'), base = parts[parts.length - 1], top = parts.length > 1 ? parts[0] : '', sub = parts.length > 2 ? parts[1] : '';
    var loc = (f.r === 'W' || f.r === 'T') ? 'W' : 'Z', ser = (f.r === 'S' || f.r === 'T'), dirKey = f.r + ':' + parts.slice(0, -1).join('/');
    var cat = CAT[top] || '', saga = SAGA[top] || '';
    if (top === "Films d'animation" && SUB[sub]) saga = SUB[sub];
    var cleanBase = base.replace(VIDEO_EXT, '').replace(/[._+]+/g, ' ');
    var isEp = /S\d{1,2}\s?E\d{1,3}/i.test(cleanBase);
    // Séries
    if (ser || top === 'SERIES' || isEp) {
      var name = ser ? (top || base.replace(VIDEO_EXT, '').split(/[ .]S\d{2}E\d{2}/i)[0]) : (top === 'SERIES' ? (sub || base) : (parts.length > 1 ? parts[parts.length - 2] : base.split(/[ .]S\d{2}E\d{2}/i)[0]));
      var base0 = name.replace(/\s*[-–]?\s*(saison\s*\d+|S\d{1,2}|\d+(\.\d+)?)\s*$/i, '').trim();
      var s = SERIES[name] || SERIES[base0];
      var st = s ? s[0] : hmdbClean(name)[0], sy = s ? s[1] : hmdbClean(name)[1], ss = s ? s[2] : '';
      var c = corr[hmdbNorm(st)] || FIX[hmdbNorm(st)];
      if (c && c[0] === null) return;
      if (c) { st = c[0]; sy = c[1] || sy; ss = c[3] || ss; }
      keep(add(st, sy, 'Séries', ss, loc, f.m), f);
      return;
    }
    var t, y;
    if (collapse[dirKey]) {
      var folder = parts[parts.length - 2], r = hmdbClean(folder); t = r[0]; y = r[1];
    } else { var r2 = hmdbClean(base); t = r2[0]; y = r2[1]; }
    var fx = hmdbFix(t, y, corr);
    if (!fx) return;
    t = fx[0]; y = fx[1];
    if (fx[2] && fx[2][2]) cat = fx[2][2];
    if (fx[2] && fx[2].length > 3) saga = fx[2][3];
    if (/^Kill Bill/i.test(t)) saga = 'Tarantino';
    if (top === 'Musique' || /^(BBC|The Blue Planet)/i.test(folderName(parts))) cat = 'Documentaires';
    keep(add(t, y, cat, saga, loc, f.m), f);
  });
  var rows = order.map(function (k) { var o = out[k]; return [o.t, o.y || 0, o.cat, o.saga, o.loc, Math.round(o.m / 1000)]; });
  // chemins des fichiers lisibles sur la TV (WD uniquement) : [titre, année, racine, chemin]
  rows.paths = [];
  order.forEach(function (k) { var o = out[k]; o.paths.sort(function (a, b) { return a[1] < b[1] ? -1 : 1; }).forEach(function (x) { rows.paths.push([o.t, o.y || 0, x[0], x[1]]); }); });
  return rows;
}

function folderName(parts) { return parts.length > 1 ? parts[parts.length - 2] : ''; }
