import pdfplumber, json, sys
pdf=pdfplumber.open(sys.argv[1])
out=[]
for i in range(20,46):
    p=pdf.pages[i]
    for t in p.extract_tables():
        out.append({'page':i+1,'rows':t})
json.dump(out,open('tables_tasks.json','w'),ensure_ascii=False,indent=0)
for t in out[:4]:
    print(t['page']); 
    for r in t['rows']: print(r)
