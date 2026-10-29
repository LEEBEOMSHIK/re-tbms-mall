from app.inventory import OptionValueCreate, SkuCreate


def option(store, kind, name, code):
    current = next((v for v in store.get()['option_values'] if v['kind'] == kind and v['name'] == name), None)
    return current or store.create_option_value(OptionValueCreate(kind=kind, name=name, code=code, is_active=True, sort_order=0))


def sku_body(store, product_id, size='M'):
    color = option(store, 'color', 'Black', 'BLK')
    value = option(store, 'size', size, 'S' + size)
    return SkuCreate(product_id=product_id, color_id=color['id'], size_id=value['id'], reorder_point=0)
