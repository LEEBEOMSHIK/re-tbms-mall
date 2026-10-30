"""Local API with a synthetic catalogue and persistent demo merchandising."""

from pathlib import Path
from secrets import compare_digest
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from starlette.concurrency import run_in_threadpool

from app.config import load_admin_token, load_cors_origins
from app.dashboard import sample_dashboard
from app.brand_about import register_brand_about_routes, DEFAULT_PATH as DEFAULT_BRAND_ABOUT_PATH
from app.admin_navigation import register_admin_navigation_routes, DEFAULT_PATH as DEFAULT_ADMIN_NAVIGATION_PATH
from app.inventory import CatalogStore, CategoryCreate, CategoryUpdate, ProductCreate, ProductUpdate, ProductDelete, SkuCreate, SkuBatchCreate, SelectedSkuBatchCreate, OptionValueCreate, OptionValueUpdate, MovementCreate, DEFAULT_CATALOG_PATH
from app.storefront import DEFAULT_PATH, StorefrontStore, StorefrontUpdate
from app.public_catalog import PublicCatalog, register_public_catalog_routes
from app.inventory import SupplierCreate, SupplierUpdate, SkuReorderPointUpdate, SkuSettingsUpdate
from app.product_images import ProductImageCreate, ProductImageStore, MAX_BODY
from app.factory import register_factory_routes
from app.reviews import PurchaseVerifier, ReviewStore, register_review_routes
from app.designs import register_design_routes
from app.customer import CustomerStore, DEFAULT_CUSTOMER_PATH, register_customer_routes


class HealthResponse(BaseModel):
    status: Literal['ok'] = 'ok'
    service: Literal['re-tbms-mall-api'] = 're-tbms-mall-api'


def create_app(*, env_file: Path | None = None, storefront_path: Path | None = None, catalog_path: Path | None = None, review_verifier: PurchaseVerifier | None = None, design_path: Path | None = None, customer_path: Path | None = None, customer_transport=None, customer_clock=None, brand_about_path: Path | None = None, admin_navigation_path: Path | None = None) -> FastAPI:
    application = FastAPI(title='re-tbms-mall API', version='0.1.0')
    application.add_middleware(
        CORSMiddleware,
        allow_origins=load_cors_origins(env_file),
        allow_credentials=False,
        allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allow_headers=['Authorization', 'Content-Type'],
    )
    store = StorefrontStore(storefront_path if storefront_path is not None else DEFAULT_PATH)
    admin_token = load_admin_token(env_file)
    catalog = CatalogStore(catalog_path if catalog_path is not None else DEFAULT_CATALOG_PATH)
    images = ProductImageStore(catalog)
    public_catalog = PublicCatalog(catalog)
    store.public_catalog = public_catalog

    def require_admin(authorization: Annotated[str | None, Header()] = None) -> None:
        if not admin_token.strip():
            raise HTTPException(503, 'Local merchandising administration is disabled. Configure STORE_ADMIN_TOKEN.')
        scheme, _, credential = (authorization or '').partition(' ')
        valid = compare_digest(credential.encode('utf-8'), admin_token.encode('utf-8'))
        if scheme.lower() != 'bearer' or not valid:
            raise HTTPException(401, 'A valid administrator bearer key is required.', headers={'WWW-Authenticate': 'Bearer'})

    register_brand_about_routes(application, require_admin, brand_about_path if brand_about_path is not None else (catalog_path.with_name("brand.sqlite3") if catalog_path is not None else DEFAULT_BRAND_ABOUT_PATH))
    register_admin_navigation_routes(application, require_admin, admin_navigation_path if admin_navigation_path is not None else (catalog_path.with_name("admin-navigation.sqlite3") if catalog_path is not None else DEFAULT_ADMIN_NAVIGATION_PATH))
    register_public_catalog_routes(application, public_catalog, require_admin)
    register_review_routes(application, ReviewStore(catalog, review_verifier), require_admin)
    register_design_routes(application, require_admin, design_path if design_path is not None else Path(__file__).resolve().parents[3] / '.local' / 'designs.sqlite3')
    register_customer_routes(application, CustomerStore(customer_path if customer_path is not None else (catalog_path.with_name(catalog_path.stem + ".customers.sqlite3") if catalog_path is not None else DEFAULT_CUSTOMER_PATH), catalog, env_file, customer_transport, customer_clock))
    register_factory_routes(application, catalog, require_admin)
    from app.shipments import register_shipment_routes
    register_shipment_routes(application, catalog, require_admin)

    @application.get('/api/v1/health', response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse()

    @application.get('/api/v1/storefront')
    def storefront() -> dict:
        return store.get(public=True)

    @application.get('/api/v1/admin/storefront', dependencies=[Depends(require_admin)])
    def admin_storefront() -> dict:
        return store.get()

    @application.get('/api/v1/admin/dashboard', dependencies=[Depends(require_admin)])
    def admin_dashboard() -> dict:
        return sample_dashboard()

    @application.put('/api/v1/admin/storefront', dependencies=[Depends(require_admin)])
    def save_storefront(body: StorefrontUpdate) -> dict:
        return store.update(body)

    @application.get('/api/v1/admin/catalog', dependencies=[Depends(require_admin)])
    def admin_catalog() -> dict:
        return catalog.get()

    @application.get('/api/v1/admin/inventory/overview', dependencies=[Depends(require_admin)])
    def inventory_overview() -> dict:
        return catalog.overview()

    @application.post('/api/v1/admin/suppliers', status_code=201, dependencies=[Depends(require_admin)])
    def create_supplier(body: SupplierCreate) -> dict:
        return catalog.create_supplier(body)

    @application.put('/api/v1/admin/suppliers/{supplier_id}', dependencies=[Depends(require_admin)])
    def update_supplier(supplier_id: str, body: SupplierUpdate) -> dict:
        return catalog.update_supplier(supplier_id, body)

    @application.post('/api/v1/admin/categories', status_code=201, dependencies=[Depends(require_admin)])
    def create_category(body: CategoryCreate) -> dict:
        return catalog.create_category(body)

    @application.put('/api/v1/admin/categories/{category_id}', dependencies=[Depends(require_admin)])
    def update_category(category_id: str, body: CategoryUpdate) -> dict:
        return catalog.update_category(category_id, body)

    @application.post('/api/v1/admin/products', status_code=201, dependencies=[Depends(require_admin)])
    def create_product(body: ProductCreate) -> dict:
        return catalog.create_product(body)

    @application.put('/api/v1/admin/products/{product_id}', dependencies=[Depends(require_admin)])
    def update_product(product_id: str, body: ProductUpdate) -> dict:
        return catalog.update_product(product_id, body)

    @application.delete('/api/v1/admin/products/{product_id}', dependencies=[Depends(require_admin)])
    def delete_product(product_id: str, body: ProductDelete) -> dict:
        return catalog.delete_product(product_id, body)

    @application.get('/api/v1/admin/products/{product_id}/images', dependencies=[Depends(require_admin)])
    def product_images(product_id: str) -> dict:
        return images.get(product_id)

    @application.post('/api/v1/admin/products/{product_id}/images', status_code=201, dependencies=[Depends(require_admin)])
    async def create_product_image(product_id: str, request: Request) -> dict:
        # Stream-bound JSON before parsing, including requests without Content-Length.
        raw = bytearray()
        async for chunk in request.stream():
            if len(raw) + len(chunk) > MAX_BODY:
                raise HTTPException(413, 'Image upload body exceeds 3 MiB.')
            raw.extend(chunk)
        try:
            body = ProductImageCreate.model_validate_json(raw)
        except ValidationError:
            # Never echo uploaded bytes in validation errors.
            raise HTTPException(422, 'Check image ID, category, name, alternative text and image data.') from None
        return await run_in_threadpool(images.create, product_id, body)

    @application.delete('/api/v1/admin/products/{product_id}/images/{image_id}', dependencies=[Depends(require_admin)])
    def delete_product_image(product_id: str, image_id: str) -> dict:
        return images.delete(product_id, image_id)

    @application.post('/api/v1/admin/skus', status_code=201, dependencies=[Depends(require_admin)])
    def create_sku(body: SkuCreate) -> dict:
        return catalog.create_sku(body)

    @application.put('/api/v1/admin/skus/{sku_id}/reorder-point', dependencies=[Depends(require_admin)])
    def update_reorder_point(sku_id: str, body: SkuReorderPointUpdate) -> dict:
        return catalog.update_reorder_point(sku_id, body)

    @application.put('/api/v1/admin/skus/{sku_id}/settings', dependencies=[Depends(require_admin)])
    def update_sku_settings(sku_id: str, body: SkuSettingsUpdate) -> dict:
        return catalog.update_sku_settings(sku_id, body)

    @application.post('/api/v1/admin/skus/batch', dependencies=[Depends(require_admin)])
    def create_sku_batch(body: SkuBatchCreate) -> dict:
        return catalog.create_sku_batch(body)

    @application.post('/api/v1/admin/skus/selected-batch', dependencies=[Depends(require_admin)])
    def create_selected_sku_batch(body: SelectedSkuBatchCreate) -> dict:
        return catalog.create_selected_sku_batch(body)

    @application.post('/api/v1/admin/option-values', status_code=201, dependencies=[Depends(require_admin)])
    def create_option_value(body: OptionValueCreate) -> dict:
        return catalog.create_option_value(body)

    @application.put('/api/v1/admin/option-values/{value_id}', dependencies=[Depends(require_admin)])
    def update_option_value(value_id: str, body: OptionValueUpdate) -> dict:
        return catalog.update_option_value(value_id, body)

    @application.post('/api/v1/admin/inventory/movements', dependencies=[Depends(require_admin)])
    def create_movement(body: MovementCreate) -> dict:
        return catalog.move(body)

    return application


app = create_app()
