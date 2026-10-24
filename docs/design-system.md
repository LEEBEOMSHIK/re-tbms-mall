# 디자인 시스템 v0.1 — 의류 쇼핑몰

디자인 시스템 구축 방향은 확정이다. 아래 수치·색상·화면 패턴은 초기 제안이며 브랜드 승인본 또는 구현된 컴포넌트가 아니다.

## 원칙

의류 사진·실측·옵션·가격을 이해하기 쉽게 보여준다. 고객 웹·관리자·시안 프로그램의 조작·상태 표현은 통일하고 목적에 따라 정보 밀도는 달리한다. 가족 회계의 색상·브랜드·용어를 가져오지 않는다.

## 토큰 초안

| 토큰 | 초안 값/규칙 |
|---|---|
| color.surface.default / subtle | #FFFFFF / #F5F5F5 |
| color.text.primary / secondary | #171717 / #525252 |
| color.action.primary / on-primary | #171717 / #FFFFFF, 브랜드 확정 후 조정 |
| color.feedback.error / success | #B91C1C / #166534, 아이콘·문구 병행 |
| color.border.default | #737373, 입력 식별 대비 검증 |
| color.focus | #1D4ED8, 2px 이상 표시 제안 |
| typography.body | 16px / line-height 1.5, 한국어 지원 서체·라이선스 미정 |
| typography.scale | 12·14·16·20·24·32px, 긴 상품명 줄바꿈 규칙 |
| spacing | 4·8·12·16·24·32·48px |
| radius | 4·8·12px, 컴포넌트별 매핑 |
| touch-target | 44×44 CSS px 이상을 내부 목표로 제안 |
| layout | 320px부터, 전환점 640/1024px 후보; 콘텐츠 기준 검증 |
| layer | base < sticky < overlay < modal < toast |
| motion | 짧은 전환, reduced-motion 대응, 필수 정보 애니메이션 의존 금지 |

토큰을 CSS 변수 등 단일 원본으로 구현하고 화면에 임의 색상·간격을 반복 입력하지 않는다. 대비는 실제 조합과 상태별로 검사하며 이 문서의 예시 색상만으로 접근성 통과를 주장하지 않는다.

## 컴포넌트와 화면 패턴

| 그룹 | 컴포넌트 | 검증 |
|---|---|---|
| 기본 | Button, Link, Input, Select, Checkbox, Dialog, Toast, Tabs | 키보드·포커스·레이블·오류·비활성 |
| 쇼핑 | ProductCard, Price, ColorOption, SizeOption, Quantity, SizeGuide, OrderSummary | 옵션명·품절·긴 상품명·할인 근거 |
| 운영 | DataTable, FilterBar, StatusBadge, BulkAction, AuditTimeline | 선택 상태·일괄 작업 확인·권한·모바일 축약 |
| 시안 | CanvasToolbar, PropertyPanel, LayerList, ColorPicker, VersionList | 드래그 대안·정밀 입력·확대/이동·저장 상태 |

모든 컴포넌트는 기본·hover·focus·pressed·disabled·loading·error 상태를 필요에 맞게 정의한다. 화면은 로딩·빈 결과·네트워크 실패·권한 없음·부분 성공을 포함한다.

상품 이미지는 일정한 카드 비율 후보(3:4)를 적용하되 중요한 옷 부분을 자르지 않는다. 실제 사진으로 crop/contain 규칙을 검증한다. 색상칩에는 색 이름, 품절에는 텍스트를 제공한다. 선택하지 않은 옵션을 임의 기본값으로 확정하지 않는다.

가격은 판매가·할인·배송비를 구분한다. 주문 확정 전 총액·반품 조건이 읽히게 한다. 선택 동의는 필수 동의와 구분하고 사전 선택하지 않는 방안을 기본으로 한다.

## 모바일·접근성

고객 웹은 모바일 우선이다. 검색 조건·스크롤·입력을 복원한다. 하단 CTA는 화면·오류·키보드 포커스를 가리지 않아야 한다. 시안의 손가락 조작과 정밀 작업을 구분하고 모바일에서 불가능한 기능은 명확하게 안내한다.

접근성 목표는 WCAG 2.2 AA 제안이다. 일반 텍스트 대비 4.5:1, 큰 텍스트 3:1, 의미 있는 비텍스트 UI 대비, 대체 텍스트, 포커스 이동·복귀, 오류 요약, 키보드·스크린리더를 확인한다. 기준과 법적 적용은 출시 시 재확인한다. [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## 운영·버전 관리

디자인 담당이 토큰·컴포넌트 카탈로그를 유지한다. 새 패턴은 기존 요소 재사용 검토 → 사용 사례·상태·접근성 명세 → 구현 → 대표 화면 검증 → 변경 기록 순서로 추가한다.

구현 시 Storybook 등 독립 컴포넌트 문서 도구를 비교해 선택한다. 시각 회귀는 상품 상세·옵션·주문서(해당 시)·관리자 표·시안 편집기를 대표로 한다. 공통 요소 변경은 모든 소비 화면을 확인한다. 예외는 사유·유효 범위·재검토 조건을 기록한다.
