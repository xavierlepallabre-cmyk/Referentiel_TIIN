import json,re
L=open('ref.txt').read().split('\n')
ACT=[("A1","Fiabiliser les interventions et communiquer"),("A2","Exécuter des opérations de logistique"),
("A3","Participer à la gestion des déchets"),("A4","Exécuter des opérations de démantèlement"),
("A5","Participer à la sécurité et à la radioprotection"),("A6","Exécuter des opérations de maintenance")]
TASKS=[
("T1.1","S'informer auprès du chef d'équipe des éléments constitutifs du dossier",2),
("T1.2","Informer sa hiérarchie des écarts constatés en termes de déroulement du chantier, de sécurité classique et/ou radiologique",2),
("T1.3","Informer la hiérarchie des remarques du client",2),
("T1.4","Assurer le suivi de sa dosimétrie individuelle et la comparer avec la valeur cible",1),
("T1.5","Appliquer les consignes issues de l'analyse des risques",1),
("T1.6","Interpréter les éléments d'information acquis par ses sens et/ou des appareils de mesure en vue d'appliquer la procédure prescrite (cas d'écarts constatés)",2),
("T1.7","Arrêter le chantier en cas de danger grave et imminent",2),
("T1.8","Appliquer les procédures prescrites dans les documents « qualité »",1),
("T1.9","Adopter une posture réflexive permettant l'optimisation de son intervention (coûts, délais, déchets, radioprotection…)",2),
("T1.10","Renseigner la traçabilité des tâches exécutées et des écarts constatés dans tous les domaines exigés",1),
("T1.11","Contrôler la bonne exécution des travaux",1),
("T1.12","Participer au contrôle du respect des objectifs de production vis-à-vis du client",1),
("T1.13","Contrôler le respect des objectifs de dosimétrie, de sécurité et de qualité vis-à-vis de son intervention",1),
("T1.14","Mesurer et rendre compte des écarts",1),
("T1.15","Vérifier le bon fonctionnement des appareils et instruments de contrôle et de mesure (validité des contrôles de conformité et d'étalonnage, bon fonctionnement)",1),
("T1.16","Participer à la mise en œuvre des contrôles de l'environnement de travail et des déchets générés",1),
("T2.1","Mettre en œuvre l'ensemble des matériels nécessaires à l'intervention",2),
("T2.2","Assurer la disponibilité et contrôler le fonctionnement des matériels par rapport à des paramètres nominaux",2),
("T2.3","Mettre en œuvre le confinement",1),
("T2.4","Participer à l'approvisionnement du chantier",1),
("T2.5","Participer à la décontamination des locaux et des matériels",1),
("T2.6","Réaliser la manutention manuelle",1),
("T2.7","Suivre le planning et les paramètres de production associés (qualité, coûts)",1),
("T2.8","Identifier les écarts et organiser les corrections mises en œuvre avec l'accord de la hiérarchie et du client",2),
("T3.1","Mettre en œuvre, suivant les conditions locales du chantier, des opérations de collecte, tri, conditionnement, étiquetage et évacuation des déchets (zonage, balisage) et reprise d'effluents : trier ses déchets, conditionner et reconditionner des déchets, respecter le zonage",1),
("T3.2","Démarrer, conduire et arrêter un système automatisé ou une installation de gestion ou traitement de déchets en utilisant des moyens de manutention associés",1),
("T4.1","Démarrer, conduire et arrêter un outillage spécifique nécessaire aux travaux envisagés (métaux et béton)",1),
("T4.2","Procéder au déplacement de charges",1),
("T5.1","Appliquer les mesures de sauvegarde adaptées dès qu'un écart, un incident ou un accident est constaté et en conserver l'historique et/ou les pièces justificatives et les résultats associés",2),
("T5.2","Faire des contrôles radiologiques",1),
("T5.3","Assurer l'habillage et le déshabillage",1),
("T5.4","Faire respecter les consignes de sûreté et de sécurité",2),
("T5.5","Mettre en place des protections biologiques",1),
("T6.1","Préparer son intervention et/ou la logistique associée",2),
("T6.2","Proposer des améliorations sur l'environnement de son intervention",2),
("T6.3","Réparer un bien par remplacement de composants",2),
("T6.4","Réaliser des opérations prescrites de contrôle et/ou de surveillance",1),
("T6.5","Réaliser des opérations planifiées",1)]
CP=[("CP1","S'informer",[("CP1.1","Rechercher les informations relatives au dossier d'intervention"),("CP1.2","Respecter les contraintes et réglementations de l'environnement nucléaire"),("CP1.3","Maîtriser les données géographiques et se repérer dans l'espace professionnel")]),
("CP2","Préparer son intervention",[("CP2.1","Identifier les risques réels ou potentiels"),("CP2.2","Participer à la planification du chantier"),("CP2.3","Respecter l'organisation matérielle de l'intervention")]),
("CP3","Communiquer avec sa hiérarchie",[("CP3.1","Informer sa hiérarchie du déroulement des interventions")]),
("CP4","Intervenir en environnement nucléaire",[("CP4.1","Mettre en œuvre des matériels"),("CP4.2","Assurer l'évacuation des déchets"),("CP4.3","Réagir en fonction des risques évalués"),("CP4.4","Réagir en cas d'incident ou d'accident"),("CP4.5","Réaliser des opérations de maintenance")]),
("CP5","Contrôler",[("CP5.1","Contrôler les paramètres physiques de l'environnement"),("CP5.2","Participer au contrôle de la qualité"),("CP5.3","Participer au contrôle final")])]
# activity conditions/results
starts={a:i for i,l in enumerate(L) for a,_ in ACT if re.match(r'^\s*'+a+' : ',l)}
end=next(i for i,l in enumerate(L) if 'RÉFÉRENTIEL DE CERTIFICATION' in l)
order=sorted(starts.items(),key=lambda x:x[1])
def bullets(lines):
    out=[]
    for l in lines:
        s=l.strip()
        if not s: continue
        if s.startswith(''): out.append({'t':s[1:].strip(),'sub':[]})
        elif re.match(r'^o\s+',s): out[-1]['sub'].append(re.sub(r'^o\s+','',s))
        elif out:
            tgt=out[-1]
            if tgt['sub']: tgt['sub'][-1]+=' '+s
            else: tgt['t']+=' '+s
    def fl(b): return b['t'] + ('' if not b['sub'] else '') 
    return [{'t':re.sub(r'\s*;$','',b['t']).rstrip(' ;'),'sub':[re.sub(r'\s*;$','',x) for x in b['sub']]} for b in out]
acts=[]
for k,(a,i) in enumerate(order):
    j=order[k+1][1] if k+1<len(order) else end
    blk=L[i+1:j]
    r=next(n for n,l in enumerate(blk) if l.strip().startswith('Résultats attendus'))
    c0=next(n for n,l in enumerate(blk) if l.strip().startswith('Conditions de réalisation'))
    acts.append({'id':a,'titre':dict(ACT)[a],'conditions':bullets(blk[c0+1:r]),'resultats':bullets(blk[r+1:])})
# task-cp detail
tc=json.load(open('task_cp.json'))
grids=json.load(open('grids.json'))
tasks=[]
for tid,titre,aut in TASKS:
    seen=set();comps=[]
    for x in tc[tid]:
        if x['cp'] in seen: continue
        seen.add(x['cp'])
        def joint(L):
            o=[]
            for it in L:
                if o and it[:1].islower(): o[-1]+=' '+it
                else: o.append(it)
            return o
        d=joint(x['donnees']);ind=joint(x['indicateurs'])
        if x['cp']=='CP4.5': d=[];ind=[]  # renvoi au descriptif commun
        comps.append({'cp':x['cp'],'donnees':d,'indicateurs':ind})
    assert sorted(seen)==grids['tc'][tid],tid
    tasks.append({'id':tid,'activite':'A'+tid[1],'titre':titre,'autonomie':aut,'competences':comps})
cp45={'taches':["T2.5","T2.6","T4.1","T4.2","T6.3","T6.4","T6.5"],
'donnees':["Tout ou partie des données suivantes :","Si action corrective : le diagnostic ; l'identification du composant défaillant ; le bien en panne totale ou partielle et les conditions de son environnement","Si action préventive : planning des interventions ; le bien et les conditions de son environnement","Cahier des charges","Dossier d'intervention : bon de travail ; consignes, autorisation de travail ; procédures écrites ; plan d'implantation ; document unique d'évaluation des risques ; plan de prévention ; dossier technique","Toutes informations en provenance de l'utilisateur ou d'autres intervenants","Les équipements de protection individuels et collectifs","Des instruments de mesure et de contrôle de radioprotection","Les pièces de rechange","Consommables","Les moyens de communication"],
'indicateurs':["Les outillages, les consommables, les moyens de manutention, le sous-ensemble ou le composant sont rassemblés et vérifiés","Toutes indisponibilités sont signalées et expliquées","Le sous-ensemble et ses frontières sont situés sur le bien sans erreur","Les éléments d'assemblage et de liaison relatifs à la dépose sont tous identifiés et situés sur le bien","Le repérage effectué optimise la durée de l'intervention, évite les erreurs et facilite les réglages","Les consignes et procédures sont respectées","Les outillages choisis parmi les matériels préparés et vérifiés sont adaptés et correctement utilisés","Les moyens de manutention sont correctement mis en œuvre","Les éléments d'assemblage et les pièces sont nettoyés, contrôlés, échangés si nécessaire, rangés et ordonnancés en préparation de l'activité de remontage","Le sous-ensemble, le composant est démonté sans détérioration","Les consignes et la gamme sont respectées","Le composant est remonté sans erreur et sans détérioration","Le composant est réglé selon les procédures","Les activités liées à l'intervention (déplacement de charges, manipulation de produits…) n'interfèrent pas sur la sécurité des personnes et des biens","Les risques sont identifiés et les mesures de prévention respectées","Le plan de prévention est compris et appliqué"]}
comps=[]
for g,gt,items in CP:
    for cid,lab in items:
        c={'id':cid,'groupe':g,'groupeTitre':gt,'libelle':lab,'savoirs':grids['cs'][cid]}
        if cid=='CP4.5': c['descriptifCommun']=cp45
        comps.append(c)
out={'source':"Référentiel Bac Pro TIIN (Techniques d'Interventions sur Installations Nucléaires)",
'autonomie':{"1":"Exécute la tâche demandée en respectant la procédure prescrite ou les règles définies par l'entreprise ou le donneur d'ordre","2":"Prépare et/ou met en œuvre et/ou contrôle la tâche demandée sous la responsabilité de sa hiérarchie"},
'activites':acts,'taches':tasks,'competences':comps}
json.dump(out,open('/home/claude/referentiel_tiin/data/activites_competences.json','w'),ensure_ascii=False,indent=1)
print(len(acts),len(tasks),len(comps)); print(acts[1]['conditions'][:2]); print(tasks[0]['competences'][0])
