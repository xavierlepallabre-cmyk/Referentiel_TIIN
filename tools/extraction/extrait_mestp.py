import docx, json, re, sys
d = docx.Document(sys.argv[1])
ref = json.load(open(sys.argv[2]))
TCP = {t['id']: {c['cp'] for c in t['competences']} for t in ref['taches']}
# année par tableau d'après les paragraphes « Première année | TPxx à TPyy »
annees = [p.text.split('|')[0].strip() for p in d.paragraphs if re.match(r'^(Première année|Terminale)\s*\|', p.text)]
L = lambda s: [x.strip() for x in re.split(r'[,;]', s) if x.strip()]
tps = []
for ti, t in enumerate(d.tables):
    for r in t.rows[1:]:
        c = [x.text.strip() for x in r.cells]
        m = re.match(r'^(TP\d+)\s*[—–-]\s*(.*)$', c[0], re.S)
        tid, titre = m.group(1), re.sub(r'\s+', ' ', m.group(2))
        statut = None
        if '/ VR EN ATTENTE' in titre: titre = titre.replace(' / VR EN ATTENTE', ''); statut = 'VR en attente'
        tps.append(dict(id=tid, titre=titre, annee='1re' if annees[ti].startswith('Premi') else 'Tle', duree='4 h',
            activites=L(c[1]), taches=L(c[2]), cpPrincipales=L(c[3]), prerequis=re.sub(r'\s+', ' ', c[4]), statut=statut))
notes = {
 **{f'TP{n}': "Aucune validation définitive des liens ni des prérequis sans les scénarios VR originaux." for n in range(35, 40)},
 'TP40': "Rattachements à ajuster au sujet attribué.",
 'TP41': "A4 limitée au déplacement de charges si effectivement réalisé ; aucune découpe. A3 : tri conventionnel ; évacuation à vérifier.",
}
for t in tps:
    if t['id'] in notes: t['note'] = notes[t['id']]
    bad = [x for x in t['taches'] if x not in TCP]; assert not bad, (t['id'], bad)
    deduites = set().union(*(TCP[x] for x in t['taches']))
    hors = [c for c in t['cpPrincipales'] if c not in deduites]
    acts = sorted({'A' + x[1] for x in t['taches']})
    if hors: print(t['id'], 'CP principales non mobilisées par ses tâches (référentiel):', hors)
    if acts != sorted(t['activites']): print(t['id'], 'activités doc', t['activites'], 'vs tâches', acts)
out = {"source": "Cartographie_41_TP_TIIN_referentiel_prerequis.docx (catalogue v8)",
 "avertissement": "Rattachements indicatifs (matrice catalogue v8). Compétences principales : potentielles, à confirmer par les gestes et preuves du dossier final. Les tâches conditionnelles ne sont acquises que si effectivement réalisées. Simulation et VR : pas de validation de gestes en milieu nucléaire réel.",
 "tp": tps}
json.dump(out, open(sys.argv[3], 'w'), ensure_ascii=False, indent=1)
print(len(tps), 'TP')
from collections import Counter
cov = Counter(x for t in tps for x in t['taches'])
print('tâches jamais visées:', [x for x in TCP if not cov[x]])
covc = Counter(x for t in tps for x in t['cpPrincipales'])
print('CP (principales) :', {c: covc[c] for c in sorted({c for s in TCP.values() for c in s})})
