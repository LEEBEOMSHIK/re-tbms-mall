"""Blender background-only static drape experiment; no production files modified."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
data=json.loads((ROOT/'assets/source.json').read_text())
def run(kind):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 verts=[];faces=[];uvs=[];face_uv=[]
 for line in (ROOT/'assets/tshirt-source.obj').read_text().splitlines():
  items=line.split()
  if not items:continue
  if items[0]=='v':
   x,y,z=map(float,items[1:4]);verts.append((x*.34*.4,-(z-.28)*.34*.4,((y-2.1474)*.34-.8)*.4))
  elif items[0]=='vt':uvs.append(tuple(map(float,items[1:3])))
  elif items[0]=='f':
   tokens=[v.split('/') for v in items[1:]];faces.append(tuple(int(v[0])-1 for v in tokens));face_uv.append([int(v[1])-1 for v in tokens])
 mesh=bpy.data.meshes.new('Garment');mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new('Garment',mesh);bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 uv_layer=mesh.uv_layers.new(name='Fabric pattern')
 for poly,coords in zip(mesh.polygons,face_uv):
  poly.use_smooth=True
  for loop,uv_id in zip(poly.loop_indices,coords):uv_layer.data[loop].uv=uvs[uv_id]
 sub=obj.modifiers.new('Smooth sewn pattern','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
 dec=obj.modifiers.new('Simulation mesh','DECIMATE');dec.ratio=.24;bpy.ops.object.modifier_apply(modifier=dec.name)
 original=[tuple(v.co) for v in obj.data.vertices]
 bpy.context.view_layer.update()
 evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());out=evaluated.to_mesh()
 positions=[];uv=[];fabric_uv=[];normals=[];indices={'front':[],'back':[]}
 for poly in out.polygons:
  local=[]
  for loop_id in poly.loop_indices:
   vertex=out.loops[loop_id].vertex_index;v=out.vertices[vertex];old=original[vertex];normal=out.corner_normals[loop_id].vector
   local.append(len(positions)//3)
   positions.extend([round(v.co.x/.4,6),round(v.co.z/.4,6),round(-v.co.y/.4,6)])
   normals.extend([normal.x,normal.z,-normal.y])
   uv.extend([round(old[0]/.4,6),round(old[2]/.4,6)])
   fu=out.uv_layers.active.data[loop_id].uv;fabric_uv.extend([fu.x*4.5,fu.y*4.5])
  depth=sum(-original[out.loops[l].vertex_index][1] for l in poly.loop_indices)/len(local);side='front' if depth>=0 else 'back'
  for i in range(1,len(local)-1):indices[side].extend([local[0],local[i],local[i+1]])
 result={'positions':positions,'normals':normals,'fabricUV':fabric_uv,'restXY':uv,'indices':indices,'projection':data['projection'],'method':'Undraped subdivided sewn pattern with open sleeves; original UVs; illustrative fit'}
 (ROOT/'assets'/('drape-'+kind+'-smooth.json')).write_text(json.dumps(result),encoding='utf-8')
 evaluated.to_mesh_clear()
for kind in ['cotton','wool']:run(kind)
