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
 pins=obj.vertex_groups.new(name='Shoulder support')
 for v in obj.data.vertices:
  z=v.co.z;x=abs(v.co.x)
  weight=max(0,min(1,(z-.19)/.07))
  if weight>0:pins.add([v.index],weight,'REPLACE')
 # Invisible fitted torso provides contact rather than letting the cloth collapse.
 bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=32,location=(0,0,-.005))
 body=bpy.context.object;body.name='Invisible contact torso';body.scale=(.175,.091,.40)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 body.modifiers.new('Contact','COLLISION');body.collision.thickness_outer=.003
 bpy.context.view_layer.objects.active=obj
 cloth=obj.modifiers.new('Gravity drape '+kind,'CLOTH');s=cloth.settings
 s.quality=8;s.mass=.18 if kind=='cotton' else .32
 s.tension_stiffness=24 if kind=='cotton' else 16;s.compression_stiffness=24 if kind=='cotton' else 16;s.shear_stiffness=12
 s.bending_stiffness=.35 if kind=='cotton' else 1.8
 s.tension_damping=8;s.compression_damping=8;s.shear_damping=8;s.air_damping=5
 s.vertex_group_mass=pins.name;s.pin_stiffness=1
 cloth.collision_settings.use_self_collision=False;cloth.collision_settings.distance_min=.002
 scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=28;scene.render.fps=24
 for f in range(1,29):
  scene.frame_set(f);bpy.context.view_layer.update();frame_object=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());frame_mesh=frame_object.to_mesh();frame_mesh.vertices[0].co.copy();frame_object.to_mesh_clear()
  print(kind,'frame',f,flush=True)
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
 result={'positions':positions,'normals':normals,'fabricUV':fabric_uv,'restXY':uv,'indices':indices,'projection':data['projection'],'method':'Blender 5.2 cloth relaxation; original sewn-pattern UVs retained; illustrative, not measured fabric'}
 (ROOT/'assets'/('drape-'+kind+'.json')).write_text(json.dumps(result),encoding='utf-8')
 evaluated.to_mesh_clear()
for kind in ['cotton','wool']:run(kind)
