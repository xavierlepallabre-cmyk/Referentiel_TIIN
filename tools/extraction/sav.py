import pdfplumber,sys,re,json
pdf=pdfplumber.open(sys.argv[1])
out=[]
for pn in range(48,59):
    p=pdf.pages[pn-1]; W=p.extract_words()
    niv=[w for w in W if w['text']=='Niveaux']
    if not niv: print('no niveaux',pn); continue
    nv=niv[0]
    nums=[w for w in W if w['text'] in '1234' and len(w['text'])==1 and 0<w['top']-nv['bottom']<20]
    COLX={int(w['text']):(w['x0']+w['x1'])/2 for w in nums}
    vx=[r for r in p.rects if r['x1']-r['x0']<2 and r['bottom']-r['top']>3]
    right=max(r['x0'] for r in vx)
    segs=sorted({(round(r['top']),round(r['bottom'])) for r in vx if abs(r['x0']-right)<2})
    left=min(COLX.values())-12
    bars=[]
    for r in p.rects:
        c=str(r.get('non_stroking_color'))
        if c.startswith('P') and r['x1']-r['x0']>12 and r['x0']>left-5:
            cx=(r['x0']+r['x1'])/2
            lv=min(COLX,key=lambda k:abs(COLX[k]-cx))
            bars.append((lv,r['top'],r['bottom']))
    lines=p.extract_text_lines(layout=False,strip=True)
    for a,b in segs:
        lv=sorted({l for l,t,bt in bars if t<b-2 and bt>a+2})
        ls=[]
        for ln in lines:
            cy=(ln['top']+ln['bottom'])/2
            if a<=cy<=b and ln['x0']<left-10:
                n=len(ln['chars'])
                bold=sum('Bold' in ch['fontname'] for ch in ln['chars'])>n/2
                ital=sum(('Italic' in ch['fontname']) or ('Oblique' in ch['fontname']) for ch in ln['chars'])>n/2
                ls.append({'x':round(ln['x0']),'t':ln['text'],'b':bold,'i':ital})
        if ls: out.append({'page':pn,'y':[a,b],'levels':lv,'lines':ls})
    print(pn,COLX,round(right),len(segs),len(bars))
json.dump(out,open('sav_raw.json','w'),ensure_ascii=False,indent=0)
