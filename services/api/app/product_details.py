"""Shared validated product details for admin writes and public projections."""
from pydantic import BaseModel, ConfigDict, Field, model_validator


class DetailInput(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, str_strip_whitespace=True)


class Measurement(DetailInput):
    size: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=60)
    value_cm: float = Field(gt=0, le=500, allow_inf_nan=False)


class ProductDetails(DetailInput):
    material_info: str = Field(default='', max_length=1000)
    care_instructions: str = Field(default='', max_length=2000)
    measurement_note: str = Field(default='', max_length=1000)
    measurements: list[Measurement] = Field(default_factory=list, max_length=100)

    @model_validator(mode='after')
    def unique_measurements(self):
        pairs = {(row.size.casefold(), row.label.casefold()) for row in self.measurements}
        if len(pairs) != len(self.measurements):
            raise ValueError('Each size and measurement label must appear once.')
        return self
