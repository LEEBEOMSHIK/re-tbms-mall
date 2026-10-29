"""Regenerate authored garment meshes using only Python's standard library.
Run from repository root: python scripts/garment-assets/convert.py
Sources/licensing/modifications: see source/provenance.json.
"""
import hashlib,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path(__file__).parent/'source'
OUT=ROOT/'apps/web/src/features/garment-designer/garment-mesh-data.json'
def mean(points): return tuple(sum(p[k] for p in points)/len(points) for k in range(3))
def read_obj(path):
 vertices=[];faces=[]
 for line in path.read_text().splitlines():
  if line.startswith('v '):vertices.append(tuple(map(float,line.split()[1:4])))
  elif line.startswith('f '):faces.append([int(part.split('/')[0])-1 for part in line.split()[1:]])
 return vertices,faces

def subdivide(vertices,faces):
 """Catmull-Clark with the standard cubic open-boundary vertex rule."""
 fp=[mean([vertices[i] for i in face]) for face in faces]
 edges={};vf=[[] for _ in vertices];ve=[[] for _ in vertices]
 for fi,face in enumerate(faces):
  for n,a in enumerate(face):
   vf[a].append(fi);key=tuple(sorted((a,face[(n+1)%len(face)])))
   edges.setdefault(key,[]).append(fi)
 for edge in edges:
  for a in edge:ve[a].append(edge)
 new=[]
 for i,p in enumerate(vertices):
  boundary=[edge[1] if edge[0]==i else edge[0] for edge in ve[i] if len(edges[edge])==1]
  if len(boundary)==2:new.append(tuple(.75*p[k]+.125*(vertices[boundary[0]][k]+vertices[boundary[1]][k]) for k in range(3)))
  elif not vf[i]:new.append(p)
  else:
   faceavg=mean([fp[f] for f in vf[i]]);edgeavg=mean([mean([vertices[a],vertices[b]]) for a,b in ve[i]]);n=len(vf[i])
   new.append(tuple((faceavg[k]+2*edgeavg[k]+(n-3)*p[k])/n for k in range(3)))
 edgeids={}
 for edge,neighbors in edges.items():
  edgeids[edge]=len(new)
  new.append(mean([vertices[i] for i in edge]+[fp[i] for i in neighbors]) if len(neighbors)==2 else mean([vertices[i] for i in edge]))
 facebase=len(new);new.extend(fp);quads=[]
 for fi,face in enumerate(faces):
  for n,a in enumerate(face):quads.append([a,edgeids[tuple(sorted((a,face[(n+1)%len(face)])))],facebase+fi,edgeids[tuple(sorted((face[n-1],a)))]])
 return new,quads

def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def sub(a,b):return tuple(a[k]-b[k] for k in range(3))
configs={
 'tshirt':dict(file='t_shirt_basic_tucked.obj',iterations=2,scale=.34,bottom=2.1474,zcenter=.28,projection=dict(xFactor=.5/.86,vOffset=1-.24-.52*.5/1.02,yFactor=.5/1.02)),
 'hoodie':dict(file='ladieshoodiedown1.obj',iterations=1,scale=.30,bottom=.412,zcenter=.4,projection=dict(xFactor=.46/.66,vOffset=1-.26-.16*.30/.63,yFactor=.30/.63))
}
result={}
for template,cfg in configs.items():
 path=SOURCE/cfg['file'];v,f=read_obj(path);sourceCounts=[len(v),len(f)]
 for _ in range(cfg['iterations']):v,f=subdivide(v,f)
 scale=cfg['scale'];v=[(x*scale,(y-cfg['bottom'])*scale-.8,(z-cfg['zcenter'])*scale) for x,y,z in v]
 normals=[[0.,0.,0.] for _ in v];triangles=[]
 for face in f:
  for j in range(1,len(face)-1):
   triangle=[face[0],face[j],face[j+1]];triangles.append(triangle)
   n=cross(sub(v[triangle[1]],v[triangle[0]]),sub(v[triangle[2]],v[triangle[0]]))
   for i in triangle:
    for k in range(3):normals[i][k]+=n[k]
 normals=[tuple(c/(math.sqrt(sum(x*x for x in n)) or 1) for c in n) for n in normals]
 groups={'front':[],'back':[],'cloth':[]}
 projection=cfg['projection']
 for triangle in triangles:
  n=mean([normals[i] for i in triangle]);p=mean([v[i] for i in triangle])
  # Classify garment hemispheres by world depth, not fold normals: a folded
  # front-facing crease must never show mirrored back artwork.
  surface='front' if p[2]>=0 else 'back'
  uv=[(.5+(1 if surface=='front' else -1)*v[i][0]*projection['xFactor'],projection['vOffset']+v[i][1]*projection['yFactor']) for i in triangle]
  if any(not(0<=u<=1 and 0<=w<=1) for u,w in uv):surface='cloth'
  groups[surface].extend(triangle)
 result[template]={'positions':[round(c,7) for p in v for c in p],'normals':[round(c,7) for n in normals for c in n],'indices':groups,'projection':projection,'source':{'filename':cfg['file'],'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'vertices':sourceCounts[0],'quads':sourceCounts[1],'subdivisions':cfg['iterations']}}
 print(template,len(v),'vertices',len(triangles),'triangles',result[template]['source'])
OUT.write_text(json.dumps(result,separators=(',',':'))+'\n')
