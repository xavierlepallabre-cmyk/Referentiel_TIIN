/* Référentiel Bac Pro TIIN — application de consultation
 * Données : window.REFERENTIEL (data/referentiel.js, généré depuis data/*.json)
 */
(() => {
'use strict';

const R = window.REFERENTIEL;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const triCode = (a, b) => a.localeCompare(b, 'fr', { numeric: true });

/* ---------------------------------------------------------------- Index */
const TACHES = new Map(R.taches.map(t => [t.id, t]));
const COMPS = new Map(R.competences.map(c => [c.id, c]));
const ACTS = new Map(R.activites.map(a => [a.id, a]));
const DOMS = new Map(R.savoirs.domaines.map(d => [d.id, d]));
const TACHES_PAR_CP = new Map(R.competences.map(c => [c.id, []]));
for (const t of R.taches) for (const tc of t.competences) TACHES_PAR_CP.get(tc.cp).push(t.id);
const CP_PAR_S = new Map(R.savoirs.domaines.map(d => [d.id, []]));
for (const c of R.competences) for (const s of c.savoirs) CP_PAR_S.get(s).push(c.id);

/* --------------------------------------------------------------- Stockage */
const CLE_SEANCES = 'refTiin.seances';
const CLE_BROUILLON = 'refTiin.brouillon';
const lire = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

/* ------------------------------------------------------------------ État */
const etat = {
  coches: new Set(),
  nivSeance: new Set([1, 2, 3, 4]),
  nivSavoirs: new Set([1, 2, 3, 4]),
  domFermes: new Set(),
  cibles: new Set(),
  selCibler: new Set(),
  fiche: 'taches',
  seanceId: null,
};

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('visible');
  clearTimeout(toast._h); toast._h = setTimeout(() => t.classList.remove('visible'), 2200);
}

/* ================================================================ Onglets */
function ouvrirVue(v) {
  $$('.onglets button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.vue === v)));
  $$('.vue').forEach(s => s.classList.toggle('active', s.id === 'vue-' + v));
  if (v === 'suivi') rendreSuivi();
  if (v === 'cibler') { rendreChoixCibles(); rendreCibler(); }
  $('#aller-resultats').hidden = v !== 'seance' || !etat.coches.size;
  window.scrollTo({ top: 0 });
}
$$('.onglets button').forEach(b => b.addEventListener('click', () => ouvrirVue(b.dataset.vue)));

/* ============================================================ Niveaux UI */
const pastille = n => n ? `<span class="niv niv-${n}" title="Niveau ${n} — ${esc(R.savoirs.niveaux[n].nom)}">N${n}</span>` : '';

function filtreNiveaux(conteneur, ens, rappel) {
  conteneur.innerHTML = '<span class="aide">Niveaux affichés :</span>' + [1, 2, 3, 4].map(n =>
    `<label><input type="checkbox" value="${n}" ${ens.has(n) ? 'checked' : ''}>${pastille(n)}</label>`).join('');
  conteneur.addEventListener('change', e => {
    const n = +e.target.value; e.target.checked ? ens.add(n) : ens.delete(n); rappel();
  });
}

/* ======================================================= Arbre des savoirs */
const profondeur = n => n.type === 'titre' ? (n.num ? n.num.split('.').length : 1) : 9;
const MARQUES = { puce: '•', tiret: '–', rond: '◦' };

/* Visibilité selon les niveaux : un nœud porteur de niveau est visible si son niveau est coché ;
 * un nœud sans niveau (titre, sous-titre, intitulé) est visible s'il couvre au moins un nœud visible. */
function visibilites(D, niveaux) {
  const N = D.noeuds, vis = new Array(N.length).fill(false);
  const tous = niveaux.size === 4;
  N.forEach((n, i) => { if (n.niveau) vis[i] = niveaux.has(n.niveau); else if (n.type === 'note') vis[i] = tous; });
  for (let i = N.length - 1; i >= 0; i--) {
    const n = N[i];
    if (n.niveau || n.type === 'note') continue;
    if (tous) { vis[i] = true; continue; }
    for (let j = i + 1; j < N.length; j++) {
      const m = N[j];
      if (n.type === 'titre') { if (m.type === 'titre' && profondeur(m) <= profondeur(n)) break; }
      else if (m.type === 'titre' || m.indent <= n.indent) break;
      if (vis[j]) { vis[i] = true; break; }
    }
  }
  return vis;
}

function rendreNoeud(n, surligne) {
  const cls = ['noeud', n.type.replace(' ', '-')];
  if (n.type === 'titre') cls.push('n' + Math.min(profondeur(n), 3));
  let txt = (n.num ? `<b>${esc(n.num)}</b> ` : '') + (n.marque ? `<span class="marque">${MARQUES[n.marque]}</span>` : '') + esc(n.texte);
  if (surligne) txt = surligner(txt, surligne);
  return `<div class="${cls.join(' ')}" style="--ind:${Math.round(n.indent * 0.9)}"><div class="txt">${txt}</div>${pastille(n.niveau)}</div>`;
}

function surligner(html, q) {
  const motifs = norm(q).split(/\s+/).filter(Boolean);
  if (!motifs.length) return html;
  // surligne sur le texte hors balises, en tolérant les accents
  return html.replace(/>([^<]+)</g, (m, t) => '>' + surlignerTexte(t, motifs) + '<').replace(/^([^<]+)/, (m, t) => surlignerTexte(t, motifs));
}
function surlignerTexte(t, motifs) {
  const n = norm(t); const marques = new Array(t.length).fill(false);
  for (const m of motifs) { let i = n.indexOf(m); while (i >= 0) { for (let k = i; k < i + m.length; k++) marques[k] = true; i = n.indexOf(m, i + 1); } }
  let out = '', ouvert = false;
  for (let i = 0; i < t.length; i++) {
    if (marques[i] && !ouvert) { out += '<mark>'; ouvert = true; }
    if (!marques[i] && ouvert) { out += '</mark>'; ouvert = false; }
    out += t[i];
  }
  return out + (ouvert ? '</mark>' : '');
}

function rendreArbre(D, niveaux) {
  const vis = visibilites(D, niveaux);
  return `<div class="arbre">${D.noeuds.map((n, i) => vis[i] ? rendreNoeud(n) : '').join('')}</div>`;
}

function rendreS8(D, q) {
  const motifs = q ? norm(q).split(/\s+/).filter(Boolean) : [];
  const ok = txt => !motifs.length || motifs.every(m => norm(txt).includes(m));
  const liste = (arr, col) => `<td data-col="${col}">${arr.length ? '<ul>' + arr.map(x => `<li>${q ? surlignerTexte(esc(x), motifs) : esc(x)}</li>`).join('') + '</ul>' : ''}</td>`;
  let html = `<p class="intro">${esc(D.intro.join(' '))} Le référentiel ne donne donc pas de colonne de niveaux pour ce savoir.</p>`;
  for (const s of D.sections) {
    let corps = '';
    for (const th of s.themes) {
      const lignes = th.lignes.filter(l => ok([th.titre, ...l.capacites, ...l.connaissances, ...l.exemples].join(' ')));
      if (motifs.length && !lignes.length && !ok(th.titre)) continue;
      corps += `<div class="s8-theme"><h4>${esc(th.titre)}</h4>${th.note ? `<p class="s8-note">${esc(th.note)}</p>` : ''}`;
      if (lignes.length) corps += `<table class="s8-table"><thead><tr><th>Capacités</th><th>Connaissances</th><th>Exemples d'activités</th></tr></thead><tbody>${
        lignes.map(l => `<tr>${liste(l.capacites, 'Capacités')}${liste(l.connaissances, 'Connaissances')}${liste(l.exemples, "Exemples d'activités")}</tr>`).join('')}</tbody></table>`;
      corps += '</div>';
    }
    if (corps) html += `<div class="noeud titre n1"><div class="txt">${esc(s.titre)}</div></div>${corps}`;
  }
  return html;
}

function statsNiveaux(D) {
  if (D.format !== 'arbre') return '<span class="aide">capacités / connaissances</span>';
  const c = { 1: 0, 2: 0, 3: 0, 4: 0 };
  D.noeuds.forEach(n => { if (n.niveau) c[n.niveau]++; });
  return [1, 2, 3, 4].filter(n => c[n]).map(n => `<span class="niv niv-${n}" title="${c[n]} élément(s) de niveau ${n}">N${n}·${c[n]}</span>`).join('');
}

/* ================================================================ SÉANCE */
function rendreListeTaches() {
  const q = norm($('#recherche-taches').value.trim());
  $('#liste-taches').innerHTML = R.activites.map(a => {
    const ts = R.taches.filter(t => t.activite === a.id && (!q || norm(t.id + ' ' + t.titre).includes(q)));
    if (!ts.length) return '';
    const nb = ts.filter(t => etat.coches.has(t.id)).length;
    return `<details class="groupe-activite" ${q || nb || !etat.coches.size ? 'open' : ''}>
      <summary><span class="code">${a.id}</span> ${esc(a.titre)}<span class="nb">${nb ? nb + ' / ' : ''}${ts.length}</span></summary>
      ${ts.map(t => `<label class="tache ${etat.coches.has(t.id) ? 'coche' : ''}">
        <input type="checkbox" value="${t.id}" ${etat.coches.has(t.id) ? 'checked' : ''}>
        <span class="id">${t.id}</span>
        <span>${esc(t.titre)} <span class="aut" title="${esc(R.autonomie[t.autonomie])}">· autonomie ${t.autonomie}</span></span>
      </label>`).join('')}
    </details>`;
  }).join('') || '<p class="aide">Aucune tâche ne correspond.</p>';
}

$('#liste-taches').addEventListener('change', e => {
  if (e.target.type !== 'checkbox') return;
  e.target.checked ? etat.coches.add(e.target.value) : etat.coches.delete(e.target.value);
  e.target.closest('.tache').classList.toggle('coche', e.target.checked);
  const det = e.target.closest('details'); const nb = $$('input:checked', det).length;
  $('.nb', det).textContent = (nb ? nb + ' / ' : '') + $$('input', det).length;
  majSeance();
});
$('#recherche-taches').addEventListener('input', rendreListeTaches);

function calculer() {
  const cps = new Map();
  for (const tid of etat.coches) for (const tc of TACHES.get(tid).competences) {
    if (!cps.has(tc.cp)) cps.set(tc.cp, []);
    cps.get(tc.cp).push(tid);
  }
  const classementCP = [...cps.entries()].map(([cp, ts]) => ({ cp, taches: ts.sort(triCode) }))
    .sort((a, b) => b.taches.length - a.taches.length || triCode(a.cp, b.cp));
  const ss = new Map();
  for (const { cp, taches } of classementCP) for (const s of COMPS.get(cp).savoirs) {
    if (!ss.has(s)) ss.set(s, { s, score: 0, cps: [] });
    const o = ss.get(s); o.score += taches.length; o.cps.push(cp);
  }
  const classementS = [...ss.values()].sort((a, b) => b.score - a.score || triCode(a.s, b.s));
  return { classementCP, classementS };
}

const jauge = (v, max, lib) => `<span class="jauge"><span class="piste"><span class="rempli" style="width:${max ? Math.round(100 * v / max) : 0}%"></span></span>${lib}</span>`;
const unique = arr => [...new Set(arr)];

function detailCP(cp, taches) {
  const c = COMPS.get(cp);
  if (c.descriptifCommun) {
    const d = c.descriptifCommun;
    return `<h4>Tâches cochées concernées</h4><div class="puces-taches">${taches.map(t => `<span class="puce lien" data-aller="tache:${t}" title="${esc(TACHES.get(t).titre)}">${t}</span>`).join('')}</div>
      <h4>Indicateurs de performance</h4><ul>${d.indicateurs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <h4>Données</h4><ul>${d.donnees.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  }
  const entrees = taches.map(t => TACHES.get(t).competences.find(x => x.cp === cp));
  const ind = unique(entrees.flatMap(e => e.indicateurs));
  const don = unique(entrees.flatMap(e => e.donnees));
  return `<h4>Tâches cochées concernées</h4><div class="puces-taches">${taches.map(t => `<span class="puce lien" data-aller="tache:${t}" title="${esc(TACHES.get(t).titre)}">${t}</span>`).join('')}</div>
    <h4>Indicateurs de performance</h4><ul>${ind.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <h4>Données / ressources</h4><ul>${don.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <h4>Savoirs associés</h4><div class="puces-taches">${c.savoirs.map(s => `<span class="puce lien" data-aller="savoir:${s}" title="${esc(DOMS.get(s).titre)}">${s}</span>`).join('')}</div>`;
}

function majSeance() {
  const n = etat.coches.size;
  $('#compteur-taches').textContent = n;
  $('#vide-seance').hidden = n > 0;
  $('#bloc-resultats').hidden = n === 0;
  $('#aller-resultats').hidden = n === 0 || !$('#vue-seance').classList.contains('active');
  sauverBrouillon();
  if (!n) return;
  const { classementCP, classementS } = calculer();
  // garder l'état ouvert/fermé des détails
  const ouverts = new Set($$('#bloc-resultats details[open]').map(d => d.dataset.cle));
  $('#liste-competences').innerHTML = classementCP.map(({ cp, taches }) => {
    const c = COMPS.get(cp);
    return `<li class="ligne-classement"><details data-cle="cp:${cp}" ${ouverts.has('cp:' + cp) ? 'open' : ''}>
      <summary><span class="code">${cp}</span><span>${esc(c.libelle)}<br><span class="aide">${c.groupe} · ${esc(c.groupeTitre)}</span></span>${jauge(taches.length, n, `${taches.length}/${n}`)}</summary>
      <div class="detail">${detailCP(cp, taches)}</div></details></li>`;
  }).join('');
  const max = classementS[0]?.score || 1;
  $('#liste-savoirs').innerHTML = classementS.map(({ s, score, cps }) => {
    const D = DOMS.get(s);
    const cle = 'sv:' + s;
    return `<li class="ligne-classement"><details data-cle="${cle}" ${ouverts.has(cle) ? 'open' : ''}>
      <summary><span class="code">${s}</span><span>${esc(D.titre)}<br><span class="aide">via ${cps.join(', ')}</span></span>${jauge(score, max, String(score))}</summary>
      <div class="detail" data-domaine="${s}">${ouverts.has(cle) ? contenuDomaine(D, etat.nivSeance) : ''}</div></details></li>`;
  }).join('');
}

const contenuDomaine = (D, niveaux) => D.format === 'arbre'
  ? (D.intro.length ? `<p class="intro">${esc(D.intro.join(' '))}</p>` : '') + rendreArbre(D, niveaux)
  : rendreS8(D, '');

// rendu paresseux des arbres de savoirs à l'ouverture
$('#liste-savoirs').addEventListener('toggle', e => {
  const det = e.target; if (!det.open) return;
  const zone = $('.detail', det);
  if (!zone.innerHTML) zone.innerHTML = contenuDomaine(DOMS.get(zone.dataset.domaine), etat.nivSeance);
}, true);

filtreNiveaux($('#filtre-niveaux-seance'), etat.nivSeance, () => {
  $$('#liste-savoirs .detail').forEach(z => { if (z.closest('details').open) z.innerHTML = contenuDomaine(DOMS.get(z.dataset.domaine), etat.nivSeance); else z.innerHTML = ''; });
});

/* --- brouillon, enregistrement, export --- */
const aujourdhui = () => new Date().toISOString().slice(0, 10);
function sauverBrouillon() {
  ecrire(CLE_BROUILLON, { id: etat.seanceId, titre: $('#seance-titre').value, date: $('#seance-date').value, taches: [...etat.coches] });
  const h = etat.coches.size ? '#t=' + [...etat.coches].sort(triCode).join(',') : ' ';
  history.replaceState(null, '', h === ' ' ? location.pathname : h);
}
$('#seance-titre').addEventListener('input', sauverBrouillon);
$('#seance-date').addEventListener('change', sauverBrouillon);

function chargerSeance(s) {
  etat.coches = new Set((s.taches || []).filter(t => TACHES.has(t)));
  etat.seanceId = s.id || null;
  $('#seance-titre').value = s.titre || '';
  $('#seance-date').value = s.date || aujourdhui();
  rendreListeTaches(); majSeance();
}

$('#btn-vider').addEventListener('click', () => {
  if (etat.coches.size && !confirm('Décocher toutes les tâches et démarrer une nouvelle séance ?')) return;
  chargerSeance({ titre: '', date: aujourdhui(), taches: [] });
});

$('#btn-enregistrer').addEventListener('click', () => {
  if (!etat.coches.size) return toast('Cochez au moins une tâche.');
  const titre = $('#seance-titre').value.trim() || 'Séance sans titre';
  const seances = lire(CLE_SEANCES, []);
  const s = { id: etat.seanceId || ('s' + Date.now()), titre, date: $('#seance-date').value || aujourdhui(), taches: [...etat.coches].sort(triCode) };
  const i = seances.findIndex(x => x.id === s.id);
  i >= 0 ? seances.splice(i, 1, s) : seances.push(s);
  etat.seanceId = s.id;
  if (ecrire(CLE_SEANCES, seances)) toast(i >= 0 ? 'Séance mise à jour.' : 'Séance enregistrée.');
  else toast("Impossible d'enregistrer dans ce navigateur.");
  sauverBrouillon();
});

function texteResume() {
  const { classementCP, classementS } = calculer();
  const n = etat.coches.size;
  const l = [];
  l.push(($('#seance-titre').value.trim() || 'Séance atelier') + ' — ' + ($('#seance-date').value || aujourdhui()));
  l.push('', 'TÂCHES RÉALISÉES');
  [...etat.coches].sort(triCode).forEach(t => l.push(`- ${t} : ${TACHES.get(t).titre}`));
  l.push('', 'COMPÉTENCES MOBILISÉES (de la plus liée à la moins liée)');
  classementCP.forEach(({ cp, taches }) => l.push(`- ${cp} ${COMPS.get(cp).libelle} — ${taches.length}/${n} (${taches.join(', ')})`));
  l.push('', 'SAVOIRS ASSOCIÉS');
  classementS.forEach(({ s, score, cps }) => l.push(`- ${s} ${DOMS.get(s).titre} — score ${score} (via ${cps.join(', ')})`));
  return l.join('\n');
}
$('#btn-copier').addEventListener('click', async () => {
  if (!etat.coches.size) return toast('Cochez au moins une tâche.');
  const t = texteResume();
  try { await navigator.clipboard.writeText(t); toast('Résumé copié.'); }
  catch {
    const ta = document.createElement('textarea'); ta.value = t; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); toast('Résumé copié.'); } catch { toast('Copie impossible.'); }
    ta.remove();
  }
});

$('#btn-imprimer').addEventListener('click', () => {
  if (!etat.coches.size) return toast('Cochez au moins une tâche.');
  const { classementCP, classementS } = calculer();
  const n = etat.coches.size;
  const niv = etat.nivSeance;
  let h = `<h1>${esc($('#seance-titre').value.trim() || 'Séance atelier')}</h1>
    <div class="sous">${esc($('#seance-date').value || aujourdhui())} · Bac Pro TIIN · ${n} tâche(s)</div>
    <h2>Tâches réalisées</h2><table>${[...etat.coches].sort(triCode).map(t => `<tr><td><b>${t}</b></td><td>${esc(TACHES.get(t).titre)}</td><td>Autonomie ${TACHES.get(t).autonomie}</td></tr>`).join('')}</table>
    <h2>Compétences mobilisées</h2><table><tr><th>Compétence</th><th>Tâches</th><th>Indicateurs de performance</th></tr>${classementCP.map(({ cp, taches }) => {
      const c = COMPS.get(cp);
      const ind = c.descriptifCommun ? c.descriptifCommun.indicateurs : unique(taches.flatMap(t => TACHES.get(t).competences.find(x => x.cp === cp).indicateurs));
      return `<tr><td><b>${cp}</b> ${esc(c.libelle)}</td><td>${taches.length}/${n}<br>${taches.join(', ')}</td><td><ul>${ind.map(x => `<li>${esc(x)}</li>`).join('')}</ul></td></tr>`;
    }).join('')}</table>
    <h2>Savoirs associés</h2>`;
  for (const { s, score, cps } of classementS) {
    const D = DOMS.get(s);
    h += `<h3>${s} — ${esc(D.titre)} <small>(score ${score}, via ${cps.join(', ')})</small></h3>`;
    if (D.format === 'arbre') {
      const vis = visibilites(D, niv);
      h += `<table>${D.noeuds.map((x, i) => vis[i] && x.type !== 'note' ? `<tr><td style="padding-left:${6 + x.indent * 0.6}pt;${x.type === 'titre' ? 'font-weight:bold' : ''}">${x.num ? esc(x.num) + ' ' : ''}${x.marque ? MARQUES[x.marque] + ' ' : ''}${esc(x.texte)}</td><td style="width:40pt">${x.niveau ? 'N' + x.niveau : ''}</td></tr>` : '').join('')}</table>`;
    } else h += rendreS8(D, '');
  }
  $('#impression').innerHTML = h;
  window.print();
});

$('#aller-resultats').addEventListener('click', () => $('#bloc-resultats').scrollIntoView({ behavior: 'smooth' }));

/* =============================================================== SAVOIRS */
function rendreSavoirs() {
  const q = $('#recherche-savoirs').value.trim();
  const motifs = norm(q).split(/\s+/).filter(Boolean);
  const zone = $('#arbre-savoirs');
  if (motifs.length) {
    // mode recherche : liste des correspondances avec leur chemin
    let html = '', total = 0;
    for (const D of R.savoirs.domaines) {
      if (D.format !== 'arbre') {
        const r = rendreS8(D, q);
        if (r.includes('<mark>')) { html += `<section class="panneau"><div class="panneau-tete"><h2><span class="code">${D.id}</span> ${esc(D.titre)}</h2></div>${r}</section>`; total++; }
        continue;
      }
      const res = D.noeuds.filter(n => n.type !== 'titre' && (!n.niveau || etat.nivSavoirs.has(n.niveau)) &&
        motifs.every(m => norm(n.texte + ' ' + n.chemin.join(' ')).includes(m)) && motifs.some(m => norm(n.texte).includes(m)));
      if (!res.length) continue;
      total += res.length;
      html += `<section class="panneau"><div class="panneau-tete"><h2><span class="code" style="color:var(--accent-2)">${D.id}</span> ${esc(D.titre)}</h2><span class="badge">${res.length}</span></div>${
        res.map(n => `<div class="noeud"><div class="txt"><span class="aide">${esc(n.chemin.join(' › '))}</span><br>${surlignerTexte(esc(n.texte), motifs)}</div>${pastille(n.niveau)}</div>`).join('')}</section>`;
    }
    zone.innerHTML = html || '<p class="vide">Aucun savoir ne correspond à cette recherche.</p>';
    return;
  }
  zone.innerHTML = R.savoirs.domaines.map(D => `<details class="domaine panneau" id="dom-${D.id}" ${etat.domFermes.has(D.id) ? '' : 'open'}>
    <summary><span class="code">${D.id}</span><h2>${esc(D.titre)}</h2><span class="stats">${statsNiveaux(D)}</span></summary>
    ${contenuDomaine(D, etat.nivSavoirs)}
    <p class="aide">Compétences liées : ${CP_PAR_S.get(D.id).map(c => `<span class="puce lien" data-aller="cp:${c}">${c}</span>`).join(' ')}</p>
  </details>`).join('');
}
$('#sommaire-savoirs').innerHTML = R.savoirs.domaines.map(D => `<a href="#dom-${D.id}" data-dom="${D.id}"><b>${D.id}</b> ${esc(D.titre)}</a>`).join('');
$('#sommaire-savoirs').addEventListener('click', e => {
  const a = e.target.closest('a'); if (!a) return; e.preventDefault();
  if ($('#recherche-savoirs').value) { $('#recherche-savoirs').value = ''; rendreSavoirs(); }
  const d = $('#dom-' + a.dataset.dom); d.open = true; d.scrollIntoView({ behavior: 'smooth' });
});
$('#def-niveaux').innerHTML = '<dl>' + [1, 2, 3, 4].map(n => `<dt>${pastille(n)} ${esc(R.savoirs.niveaux[n].nom)}</dt><dd>${esc(R.savoirs.niveaux[n].def)}</dd>`).join('') +
  `</dl><p class="aide">${esc(R.savoirs.remarqueNiveaux)}</p>`;
$('#recherche-savoirs').addEventListener('input', rendreSavoirs);
$('#arbre-savoirs').addEventListener('toggle', e => {
  const d = e.target; if (!d.classList?.contains('domaine')) return;
  const id = d.id.slice(4); d.open ? etat.domFermes.delete(id) : etat.domFermes.add(id);
}, true);
filtreNiveaux($('#filtre-niveaux-savoirs'), etat.nivSavoirs, rendreSavoirs);

/* ================================================================ FICHES */
const ul = arr => arr.length ? '<ul>' + arr.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : '';
const ulSub = arr => '<ul>' + arr.map(x => `<li>${esc(x.t)}${x.sub.length ? ul(x.sub) : ''}</li>`).join('') + '</ul>';

function ficheTache(t) {
  return `<article class="fiche panneau" id="fiche-${t.id}">
    <div class="entete-fiche"><span class="code">${t.id}</span><h3>${esc(t.titre)}</h3>
      <span class="meta">${t.activite} · ${esc(ACTS.get(t.activite).titre)} · Autonomie ${t.autonomie} : ${esc(R.autonomie[t.autonomie])}</span></div>
    <table class="table-fiche"><thead><tr><th>Compétence</th><th>Données</th><th>Indicateurs de performance</th></tr></thead><tbody>
    ${t.competences.map(tc => {
      const c = COMPS.get(tc.cp), commun = c.descriptifCommun;
      return `<tr><td class="cp" data-col="Compétence"><span class="puce lien" data-aller="cp:${tc.cp}">${tc.cp}</span> ${esc(c.libelle)}</td>
        <td data-col="Données">${commun ? '<span class="aide">Descriptif commun à 7 tâches (voir la fiche CP4.5)</span>' : ul(tc.donnees)}</td>
        <td data-col="Indicateurs de performance">${commun ? '<span class="aide">Voir la fiche CP4.5</span>' : ul(tc.indicateurs)}</td></tr>`;
    }).join('')}</tbody></table>
    ${(() => { const l = TPS.filter(tp => tp.taches.includes(t.id)); return l.length ? `<p class="aide">Idées de TP : ${l.map(tp => `<span class="puce lien" data-aller="tp:${tp.id}" title="${esc(tp.titre)}">${tp.id}</span>`).join(' ')}</p>` : ''; })()}
    <p class="aide">Ajouter à la séance : <button class="discret" data-ajout="${t.id}">${etat.coches.has(t.id) ? '✓ déjà cochée' : '+ cocher cette tâche'}</button></p>
  </article>`;
}
function ficheCompetence(c) {
  const ts = TACHES_PAR_CP.get(c.id);
  let h = `<article class="fiche panneau" id="fiche-${c.id.replace('.', '-')}">
    <div class="entete-fiche"><span class="code">${c.id}</span><h3>${esc(c.libelle)}</h3><span class="meta">${c.groupe} · ${esc(c.groupeTitre)}</span></div>
    <p><button data-cibler="${c.id}">Cibler cette compétence →</button></p>
    <p><b>Mobilisée dans ${ts.length} tâche(s) :</b></p><div class="puces-taches">${ts.map(t => `<span class="puce lien" data-aller="tache:${t}" title="${esc(TACHES.get(t).titre)}">${t}</span>`).join('')}</div>
    <p><b>Savoirs associés :</b></p><div class="puces-taches">${c.savoirs.map(s => `<span class="puce lien" data-aller="savoir:${s}">${s} · ${esc(DOMS.get(s).titre)}</span>`).join('')}</div>`;
  if (c.descriptifCommun) h += `<table class="table-fiche" style="margin-top:12px"><thead><tr><th>Données</th><th>Indicateurs de performance</th></tr></thead><tbody><tr><td data-col="Données">${ul(c.descriptifCommun.donnees)}</td><td data-col="Indicateurs">${ul(c.descriptifCommun.indicateurs)}</td></tr></tbody></table>`;
  return h + '</article>';
}
function ficheActivite(a) {
  const ts = R.taches.filter(t => t.activite === a.id);
  return `<article class="fiche panneau" id="fiche-${a.id}">
    <div class="entete-fiche"><span class="code">${a.id}</span><h3>${esc(a.titre)}</h3></div>
    <div class="puces-taches">${ts.map(t => `<span class="puce lien" data-aller="tache:${t.id}" title="${esc(t.titre)}">${t.id}</span>`).join('')}</div>
    <table class="table-fiche" style="margin-top:10px"><thead><tr><th>Conditions de réalisation</th><th>Résultats attendus</th></tr></thead>
    <tbody><tr><td data-col="Conditions de réalisation">${ulSub(a.conditions)}</td><td data-col="Résultats attendus">${ulSub(a.resultats)}</td></tr></tbody></table>
  </article>`;
}
function rendreFiches() {
  const motifs = norm($('#recherche-fiches').value.trim()).split(/\s+/).filter(Boolean);
  const ok = o => !motifs.length || motifs.every(m => norm(JSON.stringify(o)).includes(m));
  let html = '';
  if (etat.fiche === 'taches') html = R.taches.filter(ok).map(ficheTache).join('');
  else if (etat.fiche === 'competences') html = R.competences.filter(ok).map(ficheCompetence).join('');
  else html = R.activites.filter(ok).map(ficheActivite).join('');
  $('#contenu-fiches').innerHTML = html || '<p class="vide">Aucun résultat.</p>';
}
$$('.bascule button').forEach(b => b.addEventListener('click', () => {
  etat.fiche = b.dataset.fiche; $$('.bascule button').forEach(x => x.classList.toggle('actif', x === b)); rendreFiches();
}));
$('#recherche-fiches').addEventListener('input', rendreFiches);
$('#contenu-fiches').addEventListener('click', e => {
  const b = e.target.closest('[data-ajout]'); if (!b) return;
  etat.coches.add(b.dataset.ajout); rendreListeTaches(); majSeance();
  b.textContent = '✓ déjà cochée'; toast(`${b.dataset.ajout} ajoutée à la séance.`);
});

/* --- navigation croisée --- */
function aller(cible) {
  const [type, id] = cible.split(':');
  if (type === 'savoir') {
    ouvrirVue('savoirs');
    if ($('#recherche-savoirs').value) { $('#recherche-savoirs').value = ''; rendreSavoirs(); }
    const d = $('#dom-' + id); d.open = true; setTimeout(() => d.scrollIntoView({ behavior: 'smooth' }), 30);
    return;
  }
  if (type === 'tp') {
    ouvrirVue('tp'); $('#recherche-tp').value = ''; $('#filtre-tp-cp').value = ''; $('#filtre-tp-act').value = ''; rendreTP();
    const el = $('#fiche-' + id); el.open = true;
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); el.classList.add('surligne'); setTimeout(() => el.classList.remove('surligne'), 1800);
    return;
  }
  ouvrirVue('fiches');
  etat.fiche = type === 'tache' ? 'taches' : type === 'cp' ? 'competences' : 'activites';
  $$('.bascule button').forEach(x => x.classList.toggle('actif', x.dataset.fiche === etat.fiche));
  $('#recherche-fiches').value = ''; rendreFiches();
  const el = $('#fiche-' + id.replace('.', '-')) || $('#fiche-' + id);
  if (el) { setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); el.classList.add('surligne'); setTimeout(() => el.classList.remove('surligne'), 1800); }
}
document.addEventListener('click', e => {
  const a = e.target.closest('[data-aller]'); if (!a) return;
  e.preventDefault(); e.stopPropagation(); aller(a.dataset.aller);
});

/* ============================================================== MATRICES */
function rendreMatrices() {
  const cps = R.competences.map(c => c.id);
  let h = `<thead><tr><th class="ligne">Tâche</th>${cps.map(c => `<th data-aller="cp:${c}" title="${esc(COMPS.get(c).libelle)}">${c}</th>`).join('')}</tr></thead><tbody>`;
  for (const a of R.activites) {
    h += `<tr><td class="act" colspan="${cps.length + 1}" style="text-align:left">${a.id} · ${esc(a.titre)}</td></tr>`;
    for (const t of R.taches.filter(t => t.activite === a.id)) {
      const set = new Set(t.competences.map(x => x.cp));
      h += `<tr><th class="ligne" data-aller="tache:${t.id}" title="${esc(t.titre)}">${t.id}</th>${cps.map(c => `<td class="${set.has(c) ? 'x' : ''}" title="${set.has(c) ? t.id + ' × ' + c : ''}"></td>`).join('')}</tr>`;
    }
  }
  $('#matrice-tc').innerHTML = h + '</tbody>';
  const ss = R.savoirs.domaines.map(d => d.id);
  let g = `<thead><tr><th class="ligne">Compétence</th>${ss.map(s => `<th data-aller="savoir:${s}" class="vertical" title="${esc(DOMS.get(s).titre)}">${s} ${esc(DOMS.get(s).titre)}</th>`).join('')}</tr></thead><tbody>`;
  let grp = '';
  for (const c of R.competences) {
    if (c.groupe !== grp) { grp = c.groupe; g += `<tr><td class="act" colspan="${ss.length + 1}" style="text-align:left">${c.groupe} · ${esc(c.groupeTitre)}</td></tr>`; }
    g += `<tr><th class="ligne" data-aller="cp:${c.id}" title="${esc(c.libelle)}">${c.id} <span class="aide">${esc(c.libelle)}</span></th>${ss.map(s => `<td class="${c.savoirs.includes(s) ? 'x' : ''}"></td>`).join('')}</tr>`;
  }
  $('#matrice-cs').innerHTML = g + '</tbody>';
}

/* ============================================================ IDÉES DE TP */
const TPS = R.tp.tp;
const cpsDuTP = tp => [...new Set(tp.taches.flatMap(t => TACHES.get(t).competences.map(x => x.cp)))].sort(triCode);
const puceTache = t => `<span class="puce lien" data-aller="tache:${t}" title="${esc(TACHES.get(t).titre)}">${t}</span>`;

function carteTP(tp, ouvert = false, cibles = null) {
  const cps = cpsDuTP(tp);
  const li = a => a.map(x => `<li>${esc(x)}</li>`).join('');
  return `<details class="tp fiche panneau" id="fiche-${tp.id}" ${ouvert ? 'open' : ''}>
    <summary>
      <div class="entete-fiche"><span class="code">${tp.id}</span><h3>${esc(tp.titre)}</h3><span class="meta">${esc(tp.duree)} · ${esc(tp.effectif)}</span></div>
      <div class="contexte">${esc(tp.contexte)}</div>
      <div class="liens"><span class="aide">Tâches :</span>${tp.taches.map(puceTache).join('')}</div>
      <div class="liens"><span class="aide">Compétences :</span>${cps.map(c => `<span class="puce ${cibles && cibles.has(c) ? 'cible-ok' : ''}" title="${esc(COMPS.get(c).libelle)}">${c}</span>`).join('')}</div>
      <div class="tp-actions"><button class="primaire mini" data-tp-seance="${tp.id}">Charger ses tâches dans la séance</button><span class="plus">Voir le déroulé ▾</span></div>
    </summary>
    <div class="tp-corps">
      <div><h4>Matériel</h4><ul>${li(tp.materiel)}</ul></div>
      <div><h4>Ce qu'on observe / évalue</h4><ul>${li(tp.observables)}</ul></div>
      <div class="large"><h4>Déroulé</h4><ol>${li(tp.deroule)}</ol></div>
      <div><h4>Variantes</h4><ul>${li(tp.variantes)}</ul></div>
      <div><h4>Sécurité</h4><p style="margin:0">${esc(tp.securite)}</p></div>
    </div>
  </details>`;
}

function rendreTP() {
  const motifs = norm($('#recherche-tp').value.trim()).split(/\s+/).filter(Boolean);
  const cp = $('#filtre-tp-cp').value, act = $('#filtre-tp-act').value;
  const liste = TPS.filter(tp =>
    (!motifs.length || motifs.every(m => norm(JSON.stringify(tp)).includes(m))) &&
    (!cp || cpsDuTP(tp).includes(cp)) &&
    (!act || tp.taches.some(t => TACHES.get(t).activite === act)));
  $('#liste-tp').innerHTML = liste.map(tp => carteTP(tp, false, cp ? new Set([cp]) : null)).join('') || '<p class="vide">Aucun TP ne correspond.</p>';
}
$('#tp-intro').textContent = R.tp.intro + ' Chaque TP est relié aux tâches du référentiel : les compétences et savoirs en découlent.';
$('#filtre-tp-cp').innerHTML += R.competences.map(c => `<option value="${c.id}">${c.id} — ${esc(c.libelle)}</option>`).join('');
$('#filtre-tp-act').innerHTML += R.activites.map(a => `<option value="${a.id}">${a.id} — ${esc(a.titre)}</option>`).join('');
['#recherche-tp', '#filtre-tp-cp', '#filtre-tp-act'].forEach(s => $(s).addEventListener('input', rendreTP));

function chargerTP(id) {
  const tp = TPS.find(x => x.id === id);
  if (etat.coches.size && !confirm('Remplacer les tâches actuellement cochées dans la séance atelier ?')) return;
  chargerSeance({ titre: `${tp.id} · ${tp.titre}`, date: aujourdhui(), taches: tp.taches });
  ouvrirVue('seance'); toast('Tâches du TP chargées : ajustez si besoin puis enregistrez.');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tp-seance]'); if (!b) return;
  e.preventDefault(); chargerTP(b.dataset.tpSeance);
});

function rendreCiblerTP(cibles) {
  const set = new Set(cibles);
  const props = TPS.map(tp => ({ tp, n: cpsDuTP(tp).filter(c => set.has(c)).length })).filter(x => x.n)
    .sort((a, b) => b.n - a.n || triCode(a.tp.id, b.tp.id));
  $('#bloc-cibler-tp').hidden = !cibles.length;
  $('#liste-cibler-tp').innerHTML = props.length ? props.map(({ tp, n }) => `<div class="tp-mini">
      <div><b style="color:var(--accent-2)">${tp.id}</b> ${esc(tp.titre)} <span class="aide">· ${esc(tp.duree)}</span><br>
      <span class="liens" style="display:inline-flex;gap:4px;flex-wrap:wrap">${cpsDuTP(tp).filter(c => set.has(c)).map(c => `<span class="puce cible-ok">${c}</span>`).join('')}</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><span class="aide">${n}/${cibles.length}</span>
      <button class="mini" data-aller="tp:${tp.id}">Voir</button><button class="mini" data-tp-seance="${tp.id}">Charger</button></div></div>`).join('')
    : '<p class="aide">Aucun TP de la banque ne mobilise ces compétences.</p>';
}

/* ================================================================ CIBLER */
function comptages() {
  const seances = lire(CLE_SEANCES, []);
  const nCP = new Map(R.competences.map(c => [c.id, 0])), nT = new Map(R.taches.map(t => [t.id, 0]));
  for (const s of seances) {
    const cps = new Set();
    (s.taches || []).forEach(t => { if (!TACHES.has(t)) return; nT.set(t, nT.get(t) + 1); TACHES.get(t).competences.forEach(x => cps.add(x.cp)); });
    cps.forEach(c => nCP.set(c, nCP.get(c) + 1));
  }
  return { nCP, nT, nb: seances.length };
}

function rendreChoixCibles() {
  const { nCP, nb } = comptages();
  let h = '', grp = '';
  for (const c of R.competences) {
    if (c.groupe !== grp) { grp = c.groupe; h += `<h3>${c.groupe} · ${esc(c.groupeTitre)}</h3>`; }
    const n = nCP.get(c.id), on = etat.cibles.has(c.id);
    h += `<label class="cible ${on ? 'coche' : ''}"><input type="checkbox" value="${c.id}" ${on ? 'checked' : ''}>
      <span class="code">${c.id}</span><span>${esc(c.libelle)}</span>
      <span class="seances ${nb && !n ? 'zero' : ''}" title="Nombre de séances enregistrées ayant mobilisé cette compétence">${nb ? n + ' séance' + (n > 1 ? 's' : '') : ''}</span></label>`;
  }
  $('#choix-cibles').innerHTML = h;
}

function rendreCibler() {
  const cibles = [...etat.cibles].sort(triCode);
  $('#vide-cibler').hidden = cibles.length > 0;
  $('#bloc-cibler').hidden = cibles.length === 0;
  rendreCiblerTP(cibles);
  if (!cibles.length) return;
  const { nT, nb } = comptages();
  const props = R.taches.map(t => {
    const cps = t.competences.map(x => x.cp);
    return { t, couvre: cibles.filter(c => cps.includes(c)), autres: cps.filter(c => !etat.cibles.has(c)) };
  }).filter(p => p.couvre.length)
    .sort((a, b) => b.couvre.length - a.couvre.length || nT.get(a.t.id) - nT.get(b.t.id) || triCode(a.t.id, b.t.id));
  // ne garder sélectionnées que les tâches encore proposées
  for (const id of [...etat.selCibler]) if (!props.some(p => p.t.id === id)) etat.selCibler.delete(id);
  const toutes = props.filter(p => p.couvre.length === cibles.length).length;
  $('#resume-cibler').textContent = `${props.length} tâche(s) mobilisent au moins une des ${cibles.length} compétence(s) ciblée(s)` +
    (cibles.length > 1 ? ` · ${toutes} les mobilisent toutes` : '');
  const ouverts = new Set($$('#liste-cibler details[open]').map(d => d.dataset.cle));
  $('#liste-cibler').innerHTML = props.map(({ t, couvre, autres }) => {
    const n = nT.get(t.id);
    const blocs = couvre.map(cp => {
      const c = COMPS.get(cp);
      const e = t.competences.find(x => x.cp === cp);
      const ind = c.descriptifCommun ? c.descriptifCommun.indicateurs : e.indicateurs;
      const don = c.descriptifCommun ? c.descriptifCommun.donnees : e.donnees;
      return `<div class="bloc-cp"><b>${cp}</b> ${esc(c.libelle)}
        <h4>Indicateurs de performance à observer</h4><ul>${ind.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <h4>Données / ressources à prévoir</h4><ul>${don.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    }).join('');
    return `<li class="ligne-classement prop"><details data-cle="${t.id}" ${ouverts.has(t.id) ? 'open' : ''}>
      <summary><input type="checkbox" class="sel" value="${t.id}" ${etat.selCibler.has(t.id) ? 'checked' : ''} title="Sélectionner pour préparer une séance">
        <span class="code">${t.id}</span>
        <span>${esc(t.titre)}<br><span class="aide">${t.activite} · ${esc(ACTS.get(t.activite).titre)} · autonomie ${t.autonomie}${nb ? ` · pratiquée ${n} fois` : ''}</span>
          <span class="couvre">${couvre.map(c => `<span class="puce cible-ok" title="${esc(COMPS.get(c).libelle)}">${c}</span>`).join('')}${autres.map(c => `<span class="puce" title="${esc(COMPS.get(c).libelle)}">${c}</span>`).join('')}</span></span>
        ${jauge(couvre.length, cibles.length, `${couvre.length}/${cibles.length} ciblée${cibles.length > 1 ? 's' : ''}`)}</summary>
      <div class="detail">${blocs}<p><span class="puce lien" data-aller="tache:${t.id}">Voir la fiche complète de ${t.id}</span></p></div></details></li>`;
  }).join('');
  majBoutonSeanceCiblee();
}
function majBoutonSeanceCiblee() {
  const n = etat.selCibler.size;
  $('#btn-cibles-seance').textContent = n ? `Préparer une séance avec ${n} tâche${n > 1 ? 's' : ''}` : 'Cochez des tâches pour préparer une séance';
  $('#btn-cibles-seance').disabled = !n;
}

function ciblerCP(ids, ajouter = false) {
  if (!ajouter) etat.cibles.clear();
  ids.forEach(id => etat.cibles.add(id));
  ouvrirVue('cibler');
}

$('#choix-cibles').addEventListener('change', e => {
  const v = e.target.value; e.target.checked ? etat.cibles.add(v) : etat.cibles.delete(v);
  e.target.closest('.cible').classList.toggle('coche', e.target.checked);
  rendreCibler();
});
$('#liste-cibler').addEventListener('click', e => { if (e.target.classList.contains('sel')) e.stopPropagation(); });
$('#liste-cibler').addEventListener('change', e => {
  if (!e.target.classList.contains('sel')) return;
  e.target.checked ? etat.selCibler.add(e.target.value) : etat.selCibler.delete(e.target.value);
  majBoutonSeanceCiblee();
});
$('#btn-cibles-vider').addEventListener('click', () => { etat.cibles.clear(); etat.selCibler.clear(); rendreChoixCibles(); rendreCibler(); });
$('#btn-moins-travaillees').addEventListener('click', () => {
  const { nCP, nb } = comptages();
  if (!nb) return toast("Aucune séance enregistrée : impossible de savoir ce qui est peu travaillé.");
  const min = Math.min(...nCP.values());
  etat.cibles = new Set([...nCP].filter(([, n]) => n === min).map(([c]) => c));
  rendreChoixCibles(); rendreCibler();
  toast(`${etat.cibles.size} compétence(s) travaillée(s) ${min} fois sélectionnée(s).`);
});
$('#btn-cibles-seance').addEventListener('click', () => {
  if (!etat.selCibler.size) return;
  if (etat.coches.size && !confirm('Remplacer les tâches actuellement cochées dans la séance atelier ?')) return;
  chargerSeance({ titre: 'Séance ciblée : ' + [...etat.cibles].sort(triCode).join(', '), date: aujourdhui(), taches: [...etat.selCibler] });
  ouvrirVue('seance');
  toast('Séance préparée : complétez l\'intitulé puis enregistrez.');
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cibler]'); if (!b) return;
  e.preventDefault(); ciblerCP([b.dataset.cibler]);
});

/* ================================================================= SUIVI */
function rendreSuivi() {
  const seances = lire(CLE_SEANCES, []).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  $('#liste-seances').innerHTML = seances.length ? seances.map(s => `<div class="seance-enr">
      <span class="date">${esc(s.date)}</span>
      <span><b>${esc(s.titre)}</b><br><span class="aide">${s.taches.join(', ')}</span></span>
      <span class="boutons"><button data-ouvrir="${s.id}">Ouvrir</button><button class="discret" data-suppr="${s.id}">Supprimer</button></span>
    </div>`).join('') : '<p class="aide">Aucune séance enregistrée pour l\'instant. Dans l\'onglet « Séance atelier », cochez les tâches puis « Enregistrer la séance ».</p>';
  const nCP = new Map(R.competences.map(c => [c.id, 0])), nT = new Map(R.taches.map(t => [t.id, 0]));
  for (const s of seances) {
    const cps = new Set();
    s.taches.forEach(t => { if (!TACHES.has(t)) return; nT.set(t, nT.get(t) + 1); TACHES.get(t).competences.forEach(x => cps.add(x.cp)); });
    cps.forEach(c => nCP.set(c, nCP.get(c) + 1));
  }
  const max = Math.max(1, seances.length);
  const ligne = (code, lib, n, cible) => `<div class="couv ${n ? '' : 'zero'}"><span class="puce lien" data-aller="${cible}">${code}</span><span class="lib">${jauge(n, max, '')}<span class="aide">${esc(lib)}</span></span><span class="n">${n}</span></div>`;
  $('#couverture').innerHTML = `<div class="couv-colonnes">
    <div><h3>Compétences</h3><p class="aide">Cliquez sur « cibler » pour obtenir les tâches qui travaillent une compétence.</p>${R.competences.map(c => ligne(c.id, c.libelle, nCP.get(c.id), 'cp:' + c.id).replace('</div>', ` <button class="discret mini" data-cibler="${c.id}">cibler</button></div>`)).join('')}</div>
    <div><h3>Tâches</h3>${R.taches.map(t => ligne(t.id, t.titre, nT.get(t.id), 'tache:' + t.id)).join('')}</div></div>`;
}
$('#liste-seances').addEventListener('click', e => {
  const o = e.target.closest('[data-ouvrir]'), d = e.target.closest('[data-suppr]');
  const seances = lire(CLE_SEANCES, []);
  if (o) { chargerSeance(seances.find(s => s.id === o.dataset.ouvrir)); ouvrirVue('seance'); }
  if (d && confirm('Supprimer cette séance ?')) { ecrire(CLE_SEANCES, seances.filter(s => s.id !== d.dataset.suppr)); rendreSuivi(); }
});
$('#btn-exporter').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ format: 'referentiel-tiin-seances', version: 1, seances: lire(CLE_SEANCES, []) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `seances-tiin-${aujourdhui()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('#fichier-import').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    const nouvelles = (d.seances || []).filter(s => s && s.id && Array.isArray(s.taches));
    const seances = lire(CLE_SEANCES, []); const ids = new Set(seances.map(s => s.id));
    const ajout = nouvelles.filter(s => !ids.has(s.id));
    ecrire(CLE_SEANCES, seances.concat(ajout)); rendreSuivi(); toast(`${ajout.length} séance(s) importée(s).`);
  } catch { toast('Fichier non reconnu.'); }
  e.target.value = '';
});

/* ============================================================ Démarrage */
(function init() {
  const m = location.hash.match(/^#t=([\w.,]+)/);
  const br = lire(CLE_BROUILLON, null);
  if (m) chargerSeance({ titre: br?.titre || '', date: aujourdhui(), taches: m[1].split(',') });
  else if (br) chargerSeance(br);
  else chargerSeance({ titre: '', date: aujourdhui(), taches: [] });
  rendreSavoirs(); rendreFiches(); rendreMatrices(); rendreChoixCibles(); rendreTP();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
})();
