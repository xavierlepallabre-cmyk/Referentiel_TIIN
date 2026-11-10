import pdfplumber,sys,json,re
pdf=pdfplumber.open(sys.argv[1])
def matrix(pg,colpat,rowpat,isfill):
    p=pdf.pages[pg-1]; W=p.extract_words()
    cols=[(w['text'],(w['x0']+w['x1'])/2) for w in W if re.fullmatch(colpat,w['text'])]
    rows=[(w['text'],(w['top']+w['bottom'])/2) for w in W if re.fullmatch(rowpat,w['text'])]
    res={r:[] for r,_ in rows}
    for r in p.rects:
        if not isfill(r): continue
        cx=(r['x0']+r['x1'])/2; cy=(r['top']+r['bottom'])/2
        if r['x1']-r['x0']>40: continue
        c=min(cols,key=lambda c:abs(c[1]-cx)); rw=min(rows,key=lambda q:abs(q[1]-cy))
        if abs(c[1]-cx)<8 and abs(rw[1]-cy)<6: res[rw[0]].append(c[0])
    return {k:sorted(set(v)) for k,v in res.items()}
f=sys.argv[1]
tc=matrix(20,r'CP\d\.\d',r'T\d\.\d+',lambda r:str(r.get('non_stroking_color'))=='0.502')
cs=matrix(47,r'S\d',r'CP\d\.\d',lambda r:str(r.get('non_stroking_color')).startswith('P'))
json.dump({'tc':tc,'cs':cs},open('grids.json','w'),indent=0)
for k,v in cs.items(): print(k,v)
