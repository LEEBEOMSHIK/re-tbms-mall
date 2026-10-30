# WB109 / R108 AI 의류 예시 추가

내장 image_gen으로 생성. 최종 파일: apps/web/public/images/brand/human-ai.png.
육안 확인: 얼굴/픽셀/신경망 연결 그래픽, HUMAN × AI 문구, 전체 티셔츠와 여백 확인. 기존 이미지를 대체하지 않는 추가 예시. 실제 판매 상품이 아님.

## 최종 생성 프롬프트

```text
Use case: product-mockup. Create one premium editorial apparel concept photograph, portrait 4:5 aspect ratio. A single heavyweight washed charcoal oversized T-shirt laid neatly on warm pale concrete, entire shirt including sleeves and hem visible with generous margins. Large striking silk-screen graphic on chest: a white halftone human face silhouette transitioning into electric cobalt blue pixel squares, thin neural-network connections and a small orange cursor, expressing human imagination in dialogue with artificial intelligence. The only printed text is 'HUMAN × AI', elegantly set below the graphic, accurate and readable. Restrained wearable graphic design, sophisticated streetwear, realistic cotton weave and print texture, soft natural side lighting, gentle shadows, elevated independent fashion lookbook. No brands, no watermarks, no additional garments, no people, no extra text. This is a conceptual clothing sample, not a real branded product.
```

## 검증

웹 브랜드/보드 10개 통과, API 브랜드 21개 통과, TypeScript 검사 통과. 독립 검증자(ai_sample_review)가 이미지 육안·양쪽 preset/관리자 라벨 일치·자산 존재·기존 2개 주제와 사용자 제목의 SQLite 재시작 보존을 확인하고 웹/보드 10개를 재실행해 통과. 신규 기본 seed와 관리자 preset을 연결했으며 기존 저장 콘텐츠/DB는 변경하지 않는다. 기존 4:5 카드·대체텍스트·예시 caption 사용, UI 동작/저장 계약 변경 없음.

로컬 API8100 재시작 후 공개 응답 revision0의 세 번째 주제 human-ai 확인. /about HTTP200 및 HTML human-ai 참조, 이미지 HTTP200/3,188,606 bytes 확인. 이번 추가는 브라우저 레이아웃 재검증 없이 기존 WB108 카드 레이아웃을 재사용했다. 생성 원본1122×1402 육안 확인. 보드 상태 표기 in_progress는 파서 규칙 in-progress로 수정 후 테스트 통과.
