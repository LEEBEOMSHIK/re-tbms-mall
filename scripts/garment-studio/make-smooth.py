"""Smooth garment folds while keeping the existing UVs and print coordinates."""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parent
for kind in ['cotton','wool']:
 d=json.loads((ROOT/'assets'/('drape-'+kind+'.json')).read_text())
 positions=d['positions'];unique=[];lookup={};mapping=[]
 for i in range(0,len(positions),3):
  key=tuple(positions[i:i+3])
  if key not in lookup:lookup[key]=len(unique);unique.append(list(key))
  mapping.append(lookup[key])
 neighbors=[set() for _ in unique];triangles=[]
 for ids in d['indices'].values():
  for j in range(0,len(ids),3):
   a,b,c=[mapping[k] for k in ids[j:j+3]];triangles.append((a,b,c))
   neighbors[a].update([b,c]);neighbors[b].update([a,c]);neighbors[c].update([a,b])
 # Taubin smoothing suppresses fold detail without the strong shrink of plain smoothing.
 for iteration in range(180):
  for strength in [.5,-.53]:
   out=[]
   for i,v in enumerate(unique):
    ns=neighbors[i]
    out.append([v[k]+strength*(sum(unique[n][k] for n in ns)/len(ns)-v[k]) for k in range(3)] if ns else v)
   unique=out
 # Relax the remaining broad folds, then preserve the overall garment bounds.
 before=[(min(v[k] for v in unique),max(v[k] for v in unique)) for k in range(3)]
 for iteration in range(35):
  unique=[[v[k]+.5*(sum(unique[n][k] for n in neighbors[i])/len(neighbors[i])-v[k]) for k in range(3)] if neighbors[i] else v for i,v in enumerate(unique)]
 after=[(min(v[k] for v in unique),max(v[k] for v in unique)) for k in range(3)]
 for v in unique:
  for k in range(3):v[k]=before[k][0]+(v[k]-after[k][0])*(before[k][1]-before[k][0])/(after[k][1]-after[k][0])
 normals=[[0.,0.,0.] for _ in unique]
 for a,b,c in triangles:
  ab=[unique[b][k]-unique[a][k] for k in range(3)];ac=[unique[c][k]-unique[a][k] for k in range(3)]
  normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]]
  for vertex in [a,b,c]:
   for k in range(3):normals[vertex][k]+=normal[k]
 for i,n in enumerate(normals):
  length=math.sqrt(sum(v*v for v in n)) or 1
  normals[i]=[v/length for v in n]
 d['positions']=[round(v,6) for i in mapping for v in unique[i]]
 d['normals']=[round(v,7) for i in mapping for v in normals[i]]
 d['restXY']=[round(v,6) for i in mapping for v in unique[i][:2]]
 d['method']='Smoothed version of the same draped garment; original topology and fabric UV preserved; print projection follows the smooth surface to avoid residual wrinkle distortion.'
 (ROOT/'assets'/('drape-'+kind+'-smooth.json')).write_text(json.dumps(d))
 print(kind,'smooth',len(unique),'vertices')
