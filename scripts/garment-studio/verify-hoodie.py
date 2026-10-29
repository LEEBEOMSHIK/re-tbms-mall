import json,math
from pathlib import Path
for name in ['hoodie','hoodie-smooth']:
 d=json.loads(Path('assets/'+name+'.json').read_text());p=d['positions'];uv=d['fabricUV'];nv=len(p)//3
 assert set(d['indices'])=={'front','back','rib','outer','lining'}
 assert len(d['liningUV'])==nv*2 and all(math.isfinite(x) for x in d['liningUV'])
 assert len(d['normals'])==len(p) and len(uv)==nv*2
 assert all(math.isfinite(x) for a in [p,uv,d['normals']] for x in a)
 for side in ['front','back']:
  assert all(p[j*3+1]<.60 for j in d['indices'][side]),'hood upper faces in print group'
 for k,ids in d['indices'].items():
  assert ids and len(ids)%3==0 and min(ids)>=0 and max(ids)<nv
 for i in range(0,len(d['indices']['rib']),3):
  ids=d['indices']['rib'][i:i+3];coords=[p[j*3:j*3+3] for j in ids];cx=sum(c[0] for c in coords)/3
  if abs(cx)<.85:
   assert all(c[1]<=-.90999 for c in coords),'rib leaks above hem'
   period=10
  else:
   sign=1 if cx>0 else -1;a=[sign*.58,-.66,.49];n=math.sqrt(sum(x*x for x in a));a=[x/n for x in a];center=[1.265 if sign>0 else -1.275,-.47,.365]
   assert all(sum((c[k]-center[k])*a[k] for k in range(3))>=-.07501 for c in coords),'rib leaks up sleeve'
   period=3
  us=[uv[j*2] for j in ids];assert max(us)-min(us)<period*.5,'UV seam crossing'
 print('PASS',name,'rib boundaries and cylindrical UV seam continuity',nv,'vertices')
