# WB226 모바일 리뷰 상세 액션
원인: 모바일 flex:1로 긴 CTA가 줄바꿈되고 review-action은 nowrap으로 한 줄 유지, center 정렬로 높이 차이 발생. reviews.css 해당 규칙을 단일열 grid·공통48px 최소높이/패딩/서체로 교체. API/데이터 변경 없음. 검증 320/390/430·PC1440, 두 버튼 치수/넘침·실제 캡처, 독립검증. 가이드 reviews에 모바일 세로동작 안내. PC reviews:2 캡처는 변경 없음. 복구 해당 CSS/문서 diff.

검증 .local/wb226-ui.cjs: 320/390/430 두 버튼 너비 동일·높이48px·간격10px·넘침없음. PC1440 기존 중앙정렬 유지. 초기 PC top좌표 동일 assertion은 기존48/44높이 차이를 고려하지 않아 실패, center기준으로 수정 후 통과. 실제 모바일 캡처 시각확인. 가이드4검사 통과. 독립 mobile_action_review 소스 결함없음. 가이드 모바일 안내 최종 문자열 확인 완료. CSS만 변경하여 타입/API 테스트 재실행 불필요.
