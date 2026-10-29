# WB82 / R91 공장 테스트 로그인과 사전 검증

- 목적: 공장 역할의 화면·권한·작업 흐름을 바로 확인한다.
- 담당: root 로그인/BFF/통합, factory_seed 합성자료, factory_ui_audit 공장화면, factory_verify 독립검증.
- 계약: 기존 credential login 사용, 인증우회 API 없음. development + loopback + 동일 Origin만 테스트허용, 자격증명은 서버 ignored 파일만 읽음. 공장 로그인 성공 시 관리자 세션 제거.
- 데이터: 전용 합성공장/계정/상품/옵션/공유시안/제작요청. 기존자료변경금지, 반복로그인 상태초기화금지.
- 파일: factory login/BFF/helper/tests, seed/tests, factory workspace/제작요청 수정페이지, docs.
- 수용: 로그인/로그아웃, 운영/외부Host/Origin차단, 타공장/미공유시안/관리API차단, 상태변경/실패보존/재고불변, 모바일/다크/키보드.
- 격리: 434dbb9 기준 새 worktree,3182/8182 독립DB. WB80다른채팅worktree보존.
- 통합: 기준이후 변경만원본과 비교반영,3100통합검증후 archive. 원본 .env/DB복사없음.
- 복구: 이번소스변경만복구, 전용테스트자료 자동삭제없음.

### WB82 로그인 시각 일관성 후속 수정

- 사용자 캡처에서 로그인 하단 링크가 서로 붙고 filled 버튼/밑줄 링크가 섞인 문제 확인.
- 공통 LoginNavigation과 ds-login-page를 관리자/공장 로그인에 적용한다. 외곽 최대폭560, 구역 간24, 보조이동12 간격·52px 최소높이·outline·control radius·밑줄없음. 모바일1열. 입력52px/padding12·16과 설정44px을 맞춘다.
- 보조 이동은 구분선 아래 동일위계로 두며 실제 로그인은 각 폼/테스트패널 안에 둔다. 인증/데이터 계약은 바꾸지 않는다.
- 기존WB82 worktree 후속수정이며 별도독립기능아님. 변경6파일, type/lint와 독립 두로그인화면 검증 후 완료.
