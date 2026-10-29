"""Versioned internal garment design contracts."""
import math
from typing import Annotated, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

PRINT_AREAS = {'tshirt': {'x': .25, 'y': .24, 'width': .5, 'height': .5}, 'hoodie': {'x': .27, 'y': .26, 'width': .46, 'height': .30}}
TEMPLATES = [{'id': key, 'version': 1, 'name': name, 'surfaces': [{'id': surface, 'print_area': PRINT_AREAS[key]} for surface in ('front', 'back')]} for key, name in [('tshirt', '티셔츠'), ('hoodie', '후드')]]
MATERIALS = [{'id': key, 'version': 1, 'name': name} for key, name in [('cotton','면 저지'),('polyester','폴리에스터'),('sweat','스웨트'),('wool','울 스토키네트 니트')]]
Unit = Annotated[float, Field(strict=True, ge=0, le=1, allow_inf_nan=False)]
Size = Annotated[float, Field(strict=True, gt=0, le=1, allow_inf_nan=False)]
class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    @model_validator(mode='before')
    @classmethod
    def integer_versions(cls, value):
        if isinstance(value, dict):
            for key in ('schema_version', 'template_version', 'material_version'):
                if key in value and type(value[key]) is not int:
                    raise ValueError('Version must be an integer.')
        return value
class Center(StrictModel):
    x: Unit
    y: Unit
class Dimensions(StrictModel):
    width: Size
    height: Size
class Decoration(StrictModel):
    id: str
    technique: Literal['print']
    surface_id: Literal['front','back']
    asset_id: str
    center: Center
    size: Dimensions
    rotation_degrees: Annotated[float, Field(ge=-180,le=180,allow_inf_nan=False)]
    visible: bool
    @field_validator('id','asset_id')
    @classmethod
    def uuid_value(cls,v):
        return str(UUID(v))
class StudioSettings(StrictModel):
    garment: Literal['tshirt', 'hoodie']
    garmentFit: Literal['female', 'male', 'unisex']
    garmentSize: Literal['S', 'M', 'L', 'XL']
    hoodFabric: Literal['terry', 'brushed']
    fabric: Literal['cotton', 'wool', 'polyester', 'sweat']
    color: Annotated[str, Field(pattern=r'^#[0-9a-fA-F]{6}$')]
    background: Annotated[str, Field(pattern=r'^#[0-9a-fA-F]{6}$')]
    wrinkles: bool
    ruler: bool
    light: Literal['studio', 'raking']
    auto: bool

class StudioDesign(StrictModel):
    id: Annotated[int, Field(gt=0)]
    side: Literal['front', 'back']
    name: Annotated[str, Field(min_length=1, max_length=120)]
    art: Literal['type', 'graphic', 'upload', 'none']
    size: Annotated[float, Field(ge=15, le=70, allow_inf_nan=False)]
    horizontal: Annotated[float, Field(ge=25, le=75, allow_inf_nan=False)]
    wrapHorizontal: Annotated[float, Field(ge=0, le=200, allow_inf_nan=False)] | None = None
    vertical: Annotated[float, Field(ge=30, le=75, allow_inf_nan=False)]
    angle: Annotated[float, Field(ge=-180, le=180, allow_inf_nan=False)]
    asset_id: str | None = None

    @field_validator('asset_id')
    @classmethod
    def asset_uuid(cls, value):
        return str(UUID(value)) if value is not None else None

    @model_validator(mode='after')
    def upload_asset(self):
        if (self.art == 'upload') != (self.asset_id is not None):
            raise ValueError('Only uploaded artwork must reference an image asset.')
        if not self.name.strip():
            raise ValueError('Artwork name cannot be blank.')
        return self

class Studio(StrictModel):
    version: Literal[2]
    settings: StudioSettings
    designs: Annotated[list[StudioDesign], Field(max_length=20)]
    activeId: Annotated[int, Field(gt=0)] | None
    editSide: Literal['front', 'back']

    @model_validator(mode='before')
    @classmethod
    def strict_version(cls, value):
        if isinstance(value, dict) and type(value.get('version')) is not int:
            raise ValueError('Studio version must be an integer.')
        return value

    @model_validator(mode='after')
    def selection(self):
        if len({d.id for d in self.designs}) != len(self.designs):
            raise ValueError('Artwork IDs must be unique.')
        if self.activeId is not None and not any(d.id == self.activeId and d.side == self.editSide for d in self.designs):
            raise ValueError('Active artwork must exist on the edited side.')
        return self

class DesignDocument(StrictModel):
    schema_version: Literal[1, 2]
    template_id: Literal['tshirt','hoodie']
    template_version: Literal[1]
    material_id: Literal['cotton','polyester','sweat','wool']
    material_version: Literal[1]
    base_color: Annotated[str, Field(pattern=r'^#[0-9a-fA-F]{6}$')]
    gloss: Unit
    decorations: Annotated[list[Decoration],Field(max_length=20)]
    studio: Studio | None = None
    @model_validator(mode='after')
    def check_layers(self):
        if self.schema_version == 2:
            if self.studio is None or self.decorations:
                raise ValueError('Studio documents require studio state and empty legacy decorations.')
            settings = self.studio.settings
            if (self.template_id, self.material_id, self.base_color) != (settings.garment, settings.fabric, settings.color):
                raise ValueError('Studio settings must agree with the root document.')
        elif 'studio' in self.model_fields_set:
            raise ValueError('Legacy documents cannot contain studio state.')
        if len({v.id for v in self.decorations}) != len(self.decorations):
            raise ValueError('Layer IDs must be unique.')
        r = PRINT_AREAS[self.template_id]
        for d in self.decorations:
            a = math.radians(d.rotation_degrees)
            for sx, sy in ((-1,-1),(-1,1),(1,-1),(1,1)):
                x=sx*d.size.width/2; y=sy*d.size.height/2
                px=d.center.x+x*math.cos(a)-y*math.sin(a)
                py=d.center.y+x*math.sin(a)+y*math.cos(a)
                if not (r['x']-1e-10 <= px <= r['x']+r['width']+1e-10 and r['y']-1e-10 <= py <= r['y']+r['height']+1e-10):
                    raise ValueError('Every rotated layer corner must remain inside the print area.')
        return self
class RequestModel(StrictModel):
    request_id: str
    @field_validator('request_id')
    @classmethod
    def uuid_value(cls,v): return str(UUID(v))
class NamedRequest(RequestModel):
    name: Annotated[str,Field(min_length=1,max_length=120)]
    @field_validator('name')
    @classmethod
    def nonblank(cls,v):
        if not v.strip(): raise ValueError('Name cannot be blank.')
        return v
class CreateRequest(NamedRequest):
    template_id: Literal['tshirt','hoodie']
    template_version: Literal[1]
class CopyRequest(NamedRequest):
    document: DesignDocument
class UpdateRequest(CopyRequest):
    base_version: Annotated[int,Field(ge=1)]
class AssetRequest(RequestModel):
    data_url: str

def initial_document(template):
    return dict(schema_version=2, template_id=template,template_version=1,material_id='cotton',material_version=1,base_color='#e8e5df',gloss=.15,decorations=[], studio=dict(version=2,settings=dict(garment=template,garmentFit='unisex',garmentSize='M',hoodFabric='terry',fabric='cotton',color='#e8e5df',background='#f0eee9',wrinkles=True,ruler=False,light='studio',auto=False),designs=[],activeId=None,editSide='front'))
