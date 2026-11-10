import json,re
tabs=json.load(open('tables_tasks.json'))
def clean(s):
    if not s: return []
    s=s.replace('\uf0d8','\uf0b7').replace('\uf0a7','\uf0b7')
    items=[];cur=None;sub=False
    for line in s.split('\n'):
        l=line.strip()
        if not l: continue
        if l.startswith('\uf0b7'):
            if cur is not None: items.append(cur)
            cur=l[1:].strip();sub=False
        elif l.startswith('•') and cur is not None and (cur.rstrip().endswith(':') or sub):
            cur=cur.rstrip()+(' ' if cur.rstrip().endswith(':') else ', ')+l[1:].strip();sub=True
        elif l.startswith('•'):
            if cur is not None: items.append(cur)
            cur=l[1:].strip();sub=False
        else:
            cur = l if cur is None else cur+' '+l
    if cur is not None: items.append(cur)
    return [re.sub(r'\s+',' ',i).strip() for i in items]
tasks={};cur=None;last=None
for t in tabs:
    for row in t['rows']:
        cells=[c for c in row if c is not None]
        for c in cells:
            m=re.match(r'^(T\d\.\d+)$',(c or '').strip())
            if m: cur=m.group(1); tasks.setdefault(cur,[]); last=None
        cpi=[i for i,c in enumerate(cells) if re.match(r'^CP\d\.\d\s*:',c or '')]
        if cpi and cur:
            i=cpi[0]
            cp=re.match(r'^(CP\d\.\d)',cells[i]).group(1)
            data=cells[i-1] if i>0 else ''
            ind=cells[i+1] if i+1<len(cells) else ''
            last={'cp':cp,'donnees':clean(data),'indicateurs':clean(ind)}
            tasks[cur].append(last)
        elif cur and last and len(cells)>=2 and not any(re.match(r'^(Données|T\d)',c or '') for c in cells) and any(cells):
            # continuation
            if len(cells)>=3:
                last['donnees']+=clean(cells[0]); last['indicateurs']+=clean(cells[-1])
            print('CONT',cur,last['cp'],cells)
json.dump(tasks,open('task_cp.json','w'),ensure_ascii=False,indent=1)
for k,v in tasks.items(): print(k,[x['cp'] for x in v])
