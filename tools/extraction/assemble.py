import json,re
d=json.load(open('s1_s7.json'))
for D in d.values():
    N=D['noeuds'];out=[]
    for n in N:
        if out and n['type']=='item' and n['texte'].startswith('Normes') and not n['marque']:
            out[-1]['texte']+=' — '+n['texte']; continue
        if out and re.sub(r'\W','',out[-1]['texte'])==re.sub(r'\W','',n['texte']): continue
        out.append(n)
    for i,n in enumerate(out): n['id']=f"{D['id']}-{i+1:03d}"
    D['noeuds']=out; D['format']='arbre'
S3=d['S3']; S3['noeuds'].append({'type':'note','marque':None,'texte':"* Les connaissances repérées sont en relation étroite avec les savoirs S1 et S2.",'indent':0,'id':f"S3-{len(S3['noeuds'])+1:03d}",'chemin':[]})
s8=json.load(open('s8.json'))
k=0
for s in s8['sections']:
    for t in s['themes']:
        for l in t['lignes']: k+=1; l['id']=f"S8-{k:03d}"
NIV={"1":{"nom":"Niveau de l'information","def":"Le candidat a reçu une information minimale sur le concept abordé et il sait, d'une manière globale, de quoi il s'agit. Il peut donc par exemple identifier, reconnaître, citer, éventuellement désigner un élément, un composant au sein d'un système, citer une méthode de travail ou d'organisation, citer globalement le rôle et la fonction du concept appréhendé."},
"2":{"nom":"Niveau de l'expression","def":"Ce niveau est relatif à l'acquisition de moyens d'expression et de communication en utilisant le registre langagier de la discipline. Il s'agit à ce niveau de maîtriser un savoir relatif à l'expression orale (discours, réponses orales, explications) et écrite (textes, croquis, schémas, représentations graphiques et symboliques en vigueur). Le candidat doit être capable de justifier l'objet de l'étude en expliquant par exemple un fonctionnement, une structure, une méthodologie, etc."},
"3":{"nom":"Niveau de la maîtrise d'outils","def":"Cette maîtrise porte sur la mise en œuvre de techniques, d'outils, de règles et de principes en vue d'un résultat à atteindre. C'est le niveau d'acquisition de savoir-faire cognitifs (méthode, stratégie…). Ce niveau permet donc de simuler, de mettre en œuvre un équipement, de réaliser des représentations, de faire un choix argumenté, etc."},
"4":{"nom":"Niveau de la maîtrise méthodologique","def":"Il vise à poser puis à résoudre les problèmes dans un contexte global industriel. Il correspond à une maîtrise totale de la mise en œuvre d'une démarche en vue d'un but à atteindre. Il intègre des compétences élargies, une autonomie minimale et le respect des règles de fonctionnement de type industriel (respect de normes, de procédures garantissant la qualité des produits et des services)."}}
out={'niveaux':NIV,'remarqueNiveaux':"Chacun des niveaux contient le précédent et il faut être attentif à ne pas dépasser les exigences attendues.",
'domaines':[d[k] for k in sorted(d)]+[s8]}
json.dump(out,open('/home/claude/referentiel_tiin/data/savoirs.json','w'),ensure_ascii=False,indent=1)
import collections
for D in out['domaines'][:7]:
    c=collections.Counter(n.get('niveau') for n in D['noeuds'] if n['type']!='titre')
    print(D['id'],len(D['noeuds']),dict(c))
print('S8 lignes',k)
