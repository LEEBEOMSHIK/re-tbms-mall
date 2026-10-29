"""Local sample conversion of Elvaerwyn hood-down sweatshirt (CC-BY).
Original fitted silhouette and UVs retained; no physical drape claim.
"""
import bpy,json,math
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parent
for smooth in [False,True]:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 verts=[];faces=[];uvs=[];faceuv=[]
 for line in (ROOT/'assets/hoodie-source.obj').read_text().splitlines():
  a=line.split()
  if not a:continue
  if a[0]=='v':
   x,y,z=map(float,a[1:4]);verts.append((x*.30,-(z-.4)*.30,(y-.412)*.30-.8))
  elif a[0]=='vt':uvs.append(tuple(map(float,a[1:3])))
  elif a[0]=='f':
   t=[x.split('/') for x in a[1:]];faces.append([int(x[0])-1 for x in t]);faceuv.append([int(x[1])-1 for x in t])
 mesh=bpy.data.meshes.new('Hoodie');mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new('Hoodie',mesh);bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 # Source-face semantic material tags survive subdivision/decimation.
 # Non-printable hood/sleeves are separated from torso before print projection.
 for name in ['body','outer','lining']:mesh.materials.append(bpy.data.materials.new(name))
 for poly in mesh.polygons:
  c=poly.center;n=poly.normal;x,y,z=c.x,c.z,-c.y;nx,ny,nz=n.x,n.z,-n.y
  hood=(y>.52 or (y>.32 and z<(-.395+.2*(y-.35)+.1*x*x)) or (y>.30 and abs(x)<.16 and z>.20))
  sleeve=abs(x)>.56
  radial=Vector((x,0,z)) if not hood else Vector((x,y-.59,z+.13))
  inward=Vector((nx,ny,nz)).dot(radial)<-.025
  # A folded torso face can point inward without being a lining face.
  # Keep the torso print chart continuous; actual open hems/hood/sleeves
  # retain their lining classification and reverse body faces use BackSide.
  lining=inward and (hood or sleeve or y<-.75)
  poly.material_index=2 if lining else 1 if hood or sleeve else 0
 uv=mesh.uv_layers.new(name='fabric');
 for p,coords in zip(mesh.polygons,faceuv):
  p.use_smooth=True
  for l,i in zip(p.loop_indices,coords):uv.data[l].uv=uvs[i]
 sub=obj.modifiers.new('Subdivision','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
 dec=obj.modifiers.new('Preview mesh','DECIMATE');dec.ratio=.5;bpy.ops.object.modifier_apply(modifier=dec.name)
 if smooth:
  relax=obj.modifiers.new('Suppress folds','SMOOTH');relax.factor=.7;relax.iterations=12;bpy.ops.object.modifier_apply(modifier=relax.name)
  # Remove residual lower-torso creases in the explicitly smooth preview.
  vg=obj.vertex_groups.new(name='Smooth torso')
  for v in obj.data.vertices:
   x,y,z=v.co.x,v.co.z,-v.co.y
   def ramp(a,b,t):
    t=max(0,min(1,(t-a)/(b-a)));return t*t*(3-2*t)
   w=(1-ramp(.45,.65,abs(x)))*ramp(-.86,-.7,y)*(1-ramp(0,.22,y))
   if w>0:vg.add([v.index],w,'REPLACE')
  relax=obj.modifiers.new('Relax torso creases','SMOOTH');relax.vertex_group=vg.name;relax.factor=1;relax.iterations=100;bpy.ops.object.modifier_apply(modifier=relax.name)
 out=obj.data;pos=[];norm=[];fabric=[];lininguv=[];rest=[];ids={'front':[],'back':[],'rib':[],'outer':[],'lining':[]}
 from mathutils import Vector
 # Cut triangles exactly at band seams; never classify entire crossing triangles.
 axes={1:Vector((.58,-.66,.49)).normalized(),-1:Vector((-.58,-.66,.49)).normalized()}
 centers={1:Vector((1.265,-.470,.365)),-1:Vector((-1.275,-.470,.365))}
 def clip(poly,dist,positive):
  result=[]
  for a,b in zip(poly,poly[1:]+poly[:1]):
   da,db=dist(a[0]),dist(b[0]);ina=da>=-1e-9 if positive else da<=1e-9;inb=db>=-1e-9 if positive else db<=1e-9
   if ina:result.append(a)
   if ina!=inb:
    t=da/(da-db);result.append(tuple(x.lerp(y,t) for x,y in zip(a,b)))
  return result
 def emit(poly,band=None,region=0):
  if len(poly)<3:return
  side='rib' if band else 'lining' if region==2 else 'outer' if region==1 else ('front' if sum(a[0].z for a in poly)>=0 else 'back')
  tex=[]
  for co,n,f in poly:
   if band=='hem':tex.append([math.atan2(co.z+.025,co.x)/(2*math.pi)*10,co.y*3])
   elif band:
    axis=axes[band];r=co-centers[band];e=axis.cross(Vector((0,0,1))).normalized();q=axis.cross(e)
    tex.append([math.atan2(r.dot(q),r.dot(e))/(2*math.pi)*3,r.dot(axis)*3])
   else:tex.append([f.x*4.5,f.y*4.5])
  if band:
   period=10 if band=='hem' else 3
   base=tex[0][0]
   for uv in tex:uv[0]=base+(uv[0]-base+period/2)%period-period/2
  inside=[]
  sleeve=sum(abs(a[0].x) for a in poly)/len(poly)>.65
  sign=1 if sum(a[0].x for a in poly)>0 else -1
  for co,n,f in poly:
   if sleeve:
    axis=axes[sign];r=co-centers[sign];e=axis.cross(Vector((0,0,1))).normalized();q=axis.cross(e)
    inside.append([math.atan2(r.dot(q),r.dot(e))/(2*math.pi)*2,r.dot(axis)*2.4])
   else:inside.append([math.atan2(co.z,co.x)/(2*math.pi)*4,co.y*2.4])
  period=2 if sleeve else 4;base=inside[0][0]
  for uv in inside:uv[0]=base+(uv[0]-base+period/2)%period-period/2
  local=[]
  for (co,n,f),uv,inneruv in zip(poly,tex,inside):
   local.append(len(pos)//3);pos.extend([round(c,6) for c in co]);norm.extend(n.normalized());rest.extend([co.x,co.y]);fabric.extend(uv);lininguv.extend(inneruv)
  for j in range(1,len(local)-1):ids[side].extend([local[0],local[j],local[j+1]])
 out.calc_loop_triangles()
 for tri in out.loop_triangles:
  poly=[]
  for l in tri.loops:
   c=out.vertices[out.loops[l].vertex_index].co;n=out.corner_normals[l].vector;f=out.uv_layers.active.data[l].uv
   poly.append((Vector((c.x,c.z,-c.y)),Vector((n.x,n.z,-n.y)),f.copy()))
  cx=sum(a[0].x for a in poly)/3
  if abs(cx)>.85:
   band=1 if cx>0 else -1
   dist=lambda c: (c-centers[band]).dot(axes[band])+.075
  else:
   band='hem';dist=lambda c:-.91-c.y
  region=out.polygons[tri.polygon_index].material_index
  emit(clip(poly,dist,True),band,region);emit(clip(poly,dist,False),region=region)
 data={'positions':pos,'normals':norm,'fabricUV':fabric,'liningUV':lininguv,'restXY':rest,'indices':ids,'projection':{'xFactor':.58,'vOffset':.505,'yFactor':.49},'method':'Authored hood-down sweatshirt; subdivided; optional fold smoothing. Not a cloth simulation.','source':'Elvaerwyn / MakeHuman Community, CC-BY (version unspecified)'}
 name='hoodie-smooth' if smooth else 'hoodie';(ROOT/'assets'/f'{name}.json').write_text(json.dumps(data),encoding='utf-8');print(name,len(pos)//3,{k:len(v)//3 for k,v in ids.items()},flush=True)
