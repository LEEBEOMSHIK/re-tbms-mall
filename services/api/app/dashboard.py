"""Read-only synthetic operations snapshot; no orders or stock are mutated."""

AS_OF = '2026-10-26T09:00:00+09:00'


def sample_dashboard() -> dict:
    """Build a fresh snapshot so callers cannot mutate shared fixture state."""
    tasks = [
        {'id': 'task-qna', 'title': '미답변 상품 문의 확인', 'priority': 'high', 'area': 'qna', 'due_label': '샘플 기준 오늘'},
        {'id': 'task-stock', 'title': '품절·재고 부족 옵션 확인', 'priority': 'high', 'area': 'inventory', 'due_label': '샘플 기준 오늘'},
        {'id': 'task-shipping', 'title': '배송 지연 건 확인', 'priority': 'high', 'area': 'shipping', 'due_label': '샘플 기준 오늘'},
        {'id': 'task-inbound', 'title': '입고 검수 대기 의류 확인', 'priority': 'normal', 'area': 'inbound', 'due_label': '샘플 기준 오늘'},
    ]
    qna = [
        {'id': 'sample-qna-01', 'subject': 'M 사이즈 실측이 궁금해요', 'product': '소프트 라운드 니트', 'status': 'unanswered', 'received_at': '2026-10-26T08:40:00+09:00'},
        {'id': 'sample-qna-02', 'subject': '안감이 있는 제품인가요?', 'product': '클래식 트렌치 코트', 'status': 'unanswered', 'received_at': '2026-10-26T08:10:00+09:00'},
        {'id': 'sample-qna-03', 'subject': '아이보리 색상 재입고 문의', 'product': '에센셜 코튼 셔츠', 'status': 'unanswered', 'received_at': '2026-10-25T17:20:00+09:00'},
        {'id': 'sample-qna-04', 'subject': '세탁 방법을 알려주세요', 'product': '스트레이트 데님', 'status': 'answered', 'received_at': '2026-10-25T15:30:00+09:00'},
    ]
    inbound = [
        {'id': 'sample-in-01', 'product': '소프트 라운드 니트', 'sku': 'KNIT-OAT-M', 'quantity': 24, 'status': 'inspection', 'expected_date': '2026-10-26'},
        {'id': 'sample-in-02', 'product': '에센셜 코튼 셔츠', 'sku': 'SHIRT-IVORY-M', 'quantity': 30, 'status': 'expected', 'expected_date': '2026-10-26'},
        {'id': 'sample-in-03', 'product': '울 블렌드 재킷', 'sku': 'JACKET-CHAR-S', 'quantity': 12, 'status': 'expected', 'expected_date': '2026-10-27'},
        {'id': 'sample-in-04', 'product': '스트레이트 데님', 'sku': 'DENIM-INDIGO-M', 'quantity': 20, 'status': 'received', 'expected_date': '2026-10-25'},
    ]
    shipments = [
        {'id': 'sample-ship-01', 'order_label': '샘플 주문 001', 'status': 'preparing', 'item_count': 2, 'updated_at': '2026-10-26T08:50:00+09:00'},
        {'id': 'sample-ship-02', 'order_label': '샘플 주문 002', 'status': 'in_transit', 'item_count': 1, 'updated_at': '2026-10-26T08:30:00+09:00'},
        {'id': 'sample-ship-03', 'order_label': '샘플 주문 003', 'status': 'delayed', 'item_count': 3, 'updated_at': '2026-10-26T08:00:00+09:00'},
        {'id': 'sample-ship-04', 'order_label': '샘플 주문 004', 'status': 'delivered', 'item_count': 1, 'updated_at': '2026-10-25T16:00:00+09:00'},
        {'id': 'sample-ship-05', 'order_label': '샘플 주문 005', 'status': 'in_transit', 'item_count': 2, 'updated_at': '2026-10-26T07:40:00+09:00'},
    ]
    inventory = [
        {'id': 'sample-stock-01', 'product': '소프트 라운드 니트', 'sku': 'KNIT-OAT-M', 'on_hand': 5, 'reserved': 3, 'reorder_point': 5},
        {'id': 'sample-stock-02', 'product': '에센셜 코튼 셔츠', 'sku': 'SHIRT-IVORY-M', 'on_hand': 2, 'reserved': 2, 'reorder_point': 5},
        {'id': 'sample-stock-03', 'product': '울 블렌드 재킷', 'sku': 'JACKET-CHAR-S', 'on_hand': 6, 'reserved': 2, 'reorder_point': 4},
        {'id': 'sample-stock-04', 'product': '스트레이트 데님', 'sku': 'DENIM-INDIGO-M', 'on_hand': 28, 'reserved': 6, 'reorder_point': 5},
        {'id': 'sample-stock-05', 'product': '와이드 코튼 팬츠', 'sku': 'PANTS-CREAM-L', 'on_hand': 18, 'reserved': 4, 'reorder_point': 5},
    ]
    for row in inventory:
        row['available'] = max(row['on_hand'] - row['reserved'], 0)
    return {
        'mode': 'sample', 'as_of': AS_OF,
        'tasks': tasks, 'qna': qna, 'inbound': inbound,
        'shipments': shipments, 'inventory': inventory,
        'summary': {
            'open_tasks': len(tasks),
            'unanswered_qna': sum(row['status'] == 'unanswered' for row in qna),
            'inbound_pending': sum(row['status'] != 'received' for row in inbound),
            'shipping_delayed': sum(row['status'] == 'delayed' for row in shipments),
            'low_stock_skus': sum(row['available'] <= row['reorder_point'] for row in inventory),
        },
    }
