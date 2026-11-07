# WB224 리뷰 내용 계층
목적: 고객 원문을 우선 읽고 관리 기록은 필요할 때 확인. 파일 review-pages.tsx/reviews.css·guide reviews·디자인시스템·보드. API/권한/데이터 변경 없음. 목록 원문 우선, 상세/수정 원문 카드. 관리 기록 native details 기본 닫힘, 20건 초과만 기존 페이지 기능 사용. 검증 PC1440/390 다크·라이트, 접기·키보드·기록4/21건, 타입/lint/guide. 복구 이번 diff만 되돌림.

검증: .local/wb224-ui.cjs PC1440/모바일390 라이트·다크4보기, 기본접힘·Enter 펼치기·가로넘침 없음 통과. 실제 합성4건 페이지UI 없음·모의21건20/1 페이지 이동 통과. API/DB 쓰기 없음. 타입·변경파일lint 통과. 독립 review_hierarchy_check 소스 검토 결함 없음. reviews 가이드 원문과 reviews:0/1 캡처·표식 갱신.
