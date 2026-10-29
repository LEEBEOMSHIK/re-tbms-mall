# WB86 shipment API contract

All JSON strict; unknown fields422. Factory paths `/api/v1/factory/shipments`; admin `/api/v1/admin/shipments`. Same BFF paths minus `/v1`. Factory authenticated own supplier only; internal admin requires admin bearer.

GET base → `{shipments: Shipment[]}`. GET base/{id} → Shipment. Factory POST base → Shipment201.

POST body: `{id:uuid,kind:'sample'|'finished',product_id:string,production_request_id?:string,design_revision?:string,shipped_on:'YYYY-MM-DD',carrier?:string,tracking_number?:string,note?:string,lines:[{sku_id?:string,color?:string,size?:string,quantity:integer1..1000000}]}`. Optional strings default empty. 1..100 distinct lines. Sample: design_revision required (manual reference max120), production_request_id empty; color/size required, sku_id empty. Finished: production_request_id required and ready/current assigned, SKU from request; color/size empty (server snapshots); remaining requested quantity limit across dispatched shipments. Same UUID same payload idempotent; different payload409.

Shipment: `{id,kind,product_id,product_name,internal_name,supplier_id,supplier_name,production_request_id,design_revision,shipped_on,carrier,tracking_number,note,status,version,created_at,updated_at,received_on,receipt_note,inspection_note,sample_verdict,confirmed_at,lines,history}`. Strings default empty. Status dispatched/received/inspected/confirmed. version≥0. sample_verdict empty/approved/revision_requested. Each line `{id,sku_id,code,color,size,quantity,received_quantity,accepted_quantity,rejected_quantity,movement_id}`; IDs strings, counts integer≥0; movement_id empty until finished confirmed. History `{from_status,to_status,actor,created_at}`.

Admin PUT `/{id}/receive`: `{version,received_on:'YYYY-MM-DD',note?:string,lines:[{line_id,received_quantity:integer0..1000000}]}`. Exactly all lines once, received≤shipped. One finalized receipt per shipment; missing quantity is shipped-received. Split dispatch supported through separate shipments, no cumulative receiving of one shipment in this version.

Admin PUT `/{id}/inspect`: `{version,note?:string,sample_verdict?:'approved'|'revision_requested',lines:[{line_id,accepted_quantity:integer0..1000000,rejected_quantity:integer0..1000000}]}`. Exactly all lines; accepted+rejected=received. Sample requires verdict; finished omits verdict. Sample approval does not automatically change design status.

Admin PUT `/{id}/confirm`: `{version}`. Finished inspected only; atomically add accepted quantities to SKU and receipt movements, record movement_id and confirmed status. All rejected/zero received can close with no movements. Repeat with original confirmation version or current confirmed version returns same shipment, never double stock. Other stale versions409.

Receive/inspect require exact version and allowed transition; retry outdated version409. Factory cannot write receipt/inspection/confirm. Sample never reaches confirmed or stock. Finished create and confirmation are transactional and enforce stock cap1000000. No inventory balances returned to factory. Historical shipments remain visible to originating supplier after product reassignment, but new dispatch requires current assignment.

Limits: carrier80, tracking_number120, note/inspection_note/receipt_note2000, color/size80, design_revision120. Real carrier integration absent. Internal records snapshots preserve dispatched descriptions.

Dates cannot be in the server local future; received_on must be >=shipped_on. Sample approved requires at least one accepted sample. Historical finished confirmation remains allowed after supplier deactivation and uses dispatch supplier_name snapshot; public manual receipts still require active supplier. Schema13 additive migration writes unique pre-v13 .bak using SQLite backup before BEGIN IMMEDIATE; freshDB has no backup. Do not combine schema13 numbering blindly with other worktrees.
