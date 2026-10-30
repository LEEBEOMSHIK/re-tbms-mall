# WB110 / R108 의류 중심 브랜드 소개

목적: 기술회사처럼 읽히는 문구를 의류 브랜드 소개로 교정. 담당 root, 별도 독립 검증자. 범위/수정 파일: services/api/app/data/brand-about-default.json 소개 및 주제 3개, apps/web/src/components/brand-about-view.tsx 공통 구역/CTA, 요구/결정/디자인시스템/보드 문서. API 계약 변경 없음. 의존성 WB108/WB109. 수용 기준: 의류 종류·그래픽·코디 중심, 미확인 소재/품질 주장 없음, 기존 이미지/저장 콘텐츠 보존. 검증: 공개 API/HTML 문구 확인, 보드 파서 및 독립 리뷰. 복구: 해당 문구만 이전 값으로 되돌림. DB 변경 없음.

브랜드 DTO/보드 테스트10 통과. 독립 검증 apparel_copy_review: 의류 중심 표현·기술 홍보 배제·미확인 품질 약속 없음·문법/공통CTA/예시caption/문서 일관성 통과. 로컬 API 재시작 후 공개API 새 제목 확인, /about HTTP200 HTML에 새 제목 존재/이전 제목 부재 확인. 문구만 수정하여 시각 레이아웃 테스트는 재실행하지 않음. DB/이미지 변경 없음.

## 사용자 구성 정정
기존 ai-language 카드 제거, human-ai를 첫 번째(01), hidden-patterns를 두 번째(02)로 배치. 추가 이미지/문구 생성 없음. 이미지 파일/preset은 기존 저장 콘텐츠 호환을 위해 보존하고 기본 소개 카드에서만 제거. 공개 API topics human-ai,hidden-patterns 순서 확인. 고객 /about HTTP200, ai-language 이미지 참조 제거 및 human-ai 존재 확인. 독립 검증자가 두 항목 순서와 View 자동01/02 번호 확인.
