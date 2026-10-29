# WB93 / R19–R20 — 검토된 의류 샘플의 관리자 통합

사용자 승인: 2026-10-29 기존 관리자에 병합. 구현 root 웹/문서, studio_backend 서버, 독립 검증 별도.

## 범위/계약
기존 분리 WB83 디자인 API·목록/신규/상세/편집을 본체에 선택적으로 통합. 현재 본체의 상품·고객·가격 변경 보존. 검토된 샘플 렌더러를 동일 출처 iframe 내부 모듈로 운영하고 관리자 React 화면이 인증 API·자산·저장완료를 소유한다. 별도3112 서버에 의존하지 않는다. 정식 편집 화면에서 샘플 변경안내/출처 디버그/브라우저 저장 UI 제거. 공개되는 정적 모델에는 개인정보 없음. postMessage는 origin/source/channel 검증.

DesignDocument schema_version 1 기존 호환. schema_version2는 기존 필드 + studio 필수, decorations=[]; studio={version:2, settings, designs, activeId, editSide}. settings={garment:tshirt|hoodie,garmentFit:female|male|unisex,garmentSize:S|M|L|XL,hoodFabric:terry|brushed,fabric:cotton|wool|polyester|sweat,color:#RRGGBB,background:#RRGGBB,wrinkles:boolean,ruler:boolean,light:studio|raking,auto:boolean}. designs max20 each={id:positive int,side:front|back,name:string max120,art:type|graphic|upload|none,size:15..70,horizontal:25..75,wrapHorizontal?:0..200,vertical:30..75,angle:-180..180,asset_id?:UUID}. uploadはasset_id必須, server project所有権検証。sourceBlob/dataURLは保存document禁止。activeId nullまたはeditSideの既存id。新規document v2, 旧v1 unchanged legacyeditor. rootfieldtemplate_id/material_id/base_colorはstudio settingsと一致。name120、version競合/request_id冪等性維持。DB構造変更なし。

## 作業所有権
root: apps/web/**、docs/**、workboard。studio_backend: services/api/app/designs/**、main.pyのdesign登録差分、design tests。互いのファイルは編集しない。

## 検証/受入
権限なし401、別project画像拒否、v1維持、v2設定とナ염前後・wrap保存、競合409、失敗入力維持。web type/lint/test/build、admin browser保存・再読込・一覧詳細・モバイル。スクリーンショット証拠。公開push/deployなし。独立検証後のみ完了。

## 統合と清掃
既存未コミットを保護。追加/変更対象のみhashバックアップを作り、任意一括上書き禁止。旧worktreeはgitmetadata/固有ファイル/ignoredDBを確認し統合検証後archive可能な場合のみ実施。サンプルassetの必要な出所・変換ソースは保持。復旧は今回の対象ファイルだけ戻す、DB削除しない。
