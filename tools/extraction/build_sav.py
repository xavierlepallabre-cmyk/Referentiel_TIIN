import json,re
raw=json.load(open('sav_raw.json'))
TITLES={"S1":"Étude des biens : solutions constructives et comportement mécanique","S2":"Étude des biens : les chaînes fonctionnelles","S3":"Interventions de maintenance","S4":"Santé et sécurité au travail","S5":"Méthodes de maintenance","S6":"Interventions en environnement nucléaire","S7":"Installations nucléaires et exploitants","S8":"Radioprotection"}
doms={};cur=None
HEAD=re.compile(r'^(\d+(?:\.\d+)*)\.?\s+(.*)')
def marker(t):
    if t.startswith(''): return 'puce',t[1:].strip()
    m=re.match(r'^[-–]\s*(.*)',t)
    if m: return 'tiret',m.group(1)
    m=re.match(r'^o\s+(.*)',t)
    if m: return 'rond',m.group(1)
    return None,t
for row in raw:
    lines=row['lines']
    m=re.match(r'^(S\d)\.\s',lines[0]['t'])
    if m and lines[0]['b']:
        cur=m.group(1); doms.setdefault(cur,{'id':cur,'titre':TITLES[cur],'intro':[],'noeuds':[]}); 
        continue
    has_content=any(not l['b'] and not l['i'] for l in lines)
    for l in lines:
        t=l['t'].strip()
        if re.search(r'\(suite\)\s*$',t): continue
        mk,txt=marker(t)
        hm=HEAD.match(t) if l['b'] or re.match(r'^\d+\.\d+\.?\s',t) else None
        kind='titre' if (hm and (l['b'] or mk is None)) else ('note' if l['i'] and not l['b'] else ('sous-titre' if l['b'] else 'item'))
        node={'x':l['x'],'type':kind,'marque':mk,'texte':txt}
        if hm and kind=='titre': node['num']=hm.group(1); node['texte']=hm.group(2).strip()
        lv=row['levels']
        if lv and (kind in('item','sous-titre') or (kind=='titre' and not has_content)):
            node['niveau']=max(lv)
        N=doms[cur]['noeuds']
        prev=N[-1] if N else None
        # merges
        if prev and kind=='note' and prev['type']=='note' and mk is None:
            prev['texte']+=' '+txt; continue
        if prev and kind in('titre','sous-titre') and mk is None and not hm and prev['type'] in('titre','sous-titre') and prev.get('_row')==id(row):
            prev['texte']+=' '+txt; continue
        if prev and kind=='item' and mk is None and prev['type'] in('item','sous-titre') and prev.get('_row')==id(row) and (
            (prev['marque'] and l['x']>prev['x']+3 and not re.match(r'^[A-ZÉ]',txt) ) or
            (prev['marque'] and l['x']>prev['x']+3 and not prev['texte'].rstrip().endswith((':',')')) and prev['texte'][-1:] not in '.') or
            (re.match(r'^[a-zéèàç(]',txt) and not prev['texte'].rstrip().endswith(':'))):
            prev['texte']+=' '+txt; continue
        # dedupe consecutive identical
        if prev and re.sub(r'\W','',prev['texte'])==re.sub(r'\W','',txt): continue
        node['_row']=id(row)
        N.append(node)
# intro notes at top of S before first title -> intro
for d in doms.values():
    N=d['noeuds']
    while N and N[0]['type']=='note': d['intro'].append(N.pop(0)['texte'])
    xs=sorted({n['x'] for n in N}); mn=min(xs)
    stack=[]
    for i,n in enumerate(N):
        n.pop('_row',None)
        n['indent']=n.pop('x')-mn
        n['id']=f"{d['id']}-{i+1:03d}"
        if n['type']=='titre':
            depth=n['num'].count('.')+1 if 'num' in n else 1
            stack=[s for s in stack if s[0]<depth]+[(depth,(n.get('num','')+' '+n['texte']).strip())]
        n['chemin']=[s[1] for s in stack if s[1]!=((n.get('num','')+' '+n['texte']).strip())] if n['type']=='titre' else [s[1] for s in stack]
json.dump(doms,open('s1_s7.json','w'),ensure_ascii=False,indent=1)
for d in doms.values():
    print('=====',d['id'],d['titre'],'| intro:',len(d['intro']))
    for n in d['noeuds']:
        print(f"{n.get('niveau','·')} {' '*(n['indent']//4)}{'['+n['type'][0]+']'} {n.get('num','')} {(n['marque'] or '')[:1]} {n['texte'][:110]}")
