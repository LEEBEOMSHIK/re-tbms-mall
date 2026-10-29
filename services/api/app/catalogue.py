"""Synthetic display-only apparel catalogue. Prices do not enable ordering."""

CATEGORIES = [
    {'id': 'tops', 'name': '상의'}, {'id': 'outer', 'name': '아우터'},
    {'id': 'bottoms', 'name': '하의'}, {'id': 'dresses', 'name': '원피스'},
]

_ROWS = [
    ('소프트 라운드 니트', 49000, '오트밀', '포근한 감촉과 여유로운 실루엣의 데일리 니트.'),
    ('에센셜 코튼 셔츠', 45000, '아이보리', '단정한 칼라와 자연스러운 핏의 코튼 셔츠.'),
    ('스트라이프 롱 슬리브', 32000, '네이비', '가볍게 겹쳐 입기 좋은 스트라이프 티셔츠.'),
    ('클래식 트렌치 코트', 129000, '샌드 베이지', '간절기 옷장에 오래 머무를 클래식 트렌치.'),
    ('울 블렌드 재킷', 99000, '차콜', '간결한 라인으로 완성한 여유로운 재킷.'),
    ('소프트 니트 카디건', 65000, '모카', '차분한 컬러와 부드러운 짜임의 카디건.'),
    ('와이드 코튼 팬츠', 59000, '크림', '편안한 움직임을 위한 와이드 실루엣.'),
    ('스트레이트 데님', 69000, '인디고', '어떤 상의와도 어울리는 스트레이트 데님.'),
    ('플리츠 미디 스커트', 62000, '브라운', '걸음마다 자연스럽게 흐르는 미디 스커트.'),
    ('니트 롱 원피스', 79000, '토프', '한 벌로 편안하게 완성하는 가을 스타일.'),
    ('코튼 셔츠 원피스', 89000, '올리브', '차분한 컬러와 단정한 디테일의 셔츠 원피스.'),
    ('레이어드 슬립 원피스', 72000, '블랙', '니트와 셔츠에 겹쳐 입는 담백한 슬립 원피스.'),
]
PRODUCTS = [
    {'id': f'p{i:03}', 'name': row[0], 'category_id': CATEGORIES[(i-1)//3]['id'],
     'price': row[1], 'image': f'/images/products/p{i:03}.svg', 'color': row[2], 'description': row[3]}
    for i, row in enumerate(_ROWS, 1)
]
PRODUCT_IDS = frozenset(product['id'] for product in PRODUCTS)
DEFAULT_SECTIONS = [
    {'id': category['id'], 'title': category['name'], 'subtitle': subtitle,
     'kind': 'category', 'product_ids': [p['id'] for p in PRODUCTS if p['category_id'] == category['id']], 'enabled': True}
    for category, subtitle in zip(CATEGORIES, ['매일 손이 가는 부드러운 기본', '계절을 가볍게 걸치다', '자연스럽고 편안한 실루엣', '한 벌로 완성하는 하루'])
] + [
    {'id': 'autumn-edit', 'title': '가을, 차분한 온도', 'subtitle': '니트와 코트로 채우는 계절의 옷장',
     'kind': 'collection', 'product_ids': ['p001', 'p004', 'p006', 'p010'], 'enabled': True},
]
