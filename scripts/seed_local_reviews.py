"""Insert labelled synthetic reviews into this checkout's local catalog only."""
import argparse
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sqlite3
from uuid import NAMESPACE_URL, uuid5

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--local-demo', action='store_true')
    args = parser.parse_args()
    if not args.local_demo:
        parser.error('--local-demo required')
    target = ROOT / '.local/catalog.sqlite3'
    if not target.is_file() or target.resolve().parent != (ROOT / '.local').resolve():
        raise ValueError('Existing checkout local catalog required')
    with closing(sqlite3.connect(target)) as db:
        db.execute('PRAGMA foreign_keys=ON')
        products = db.execute('SELECT id FROM products ORDER BY id LIMIT 4').fetchall()
        if not products:
            raise ValueError('Existing products required')
        backup = target.with_name('catalog.pre-review-demo-' + datetime.now().strftime('%Y%m%d%H%M%S') + '.bak')
        with closing(sqlite3.connect(backup)) as dest:
            db.backup(dest)
        samples = [
            (5, '프린트가 선명하고 원단이 부드러워요. 평소 사이즈로 잘 맞았습니다.', False, False, ''),
            (4, '여유 있는 핏이라 편하게 입기 좋아요. 소매 길이는 조금 길었습니다.', False, False, '소중한 의견 감사합니다. 사이즈 선택에 참고하실 수 있도록 안내를 보강하겠습니다.'),
            (2, '생각보다 사이즈가 작게 느껴졌어요. 교환 방법을 알고 싶습니다.', False, False, ''),
            (3, '사진과 색감 차이가 있어 확인을 요청합니다.', True, False, ''),
            (5, '배송이 빠르고 포장도 깔끔했습니다.', False, False, '이용해 주셔서 감사합니다. 편안하게 착용하시길 바랍니다.'),
            (1, '삭제된 후기 표시를 확인하는 테스트입니다.', False, True, ''),
            (4, '세탁 후에도 프린트가 잘 유지됩니다. 다음 디자인도 기대할게요.', False, False, ''),
            (3, '숨김 처리 및 답변 완료 조합을 확인하는 테스트입니다.', True, False, '확인 후 안내드렸습니다.'),
        ]
        inserted = 0
        with db:
            for i, (rating, body, hidden, deleted, reply) in enumerate(samples):
                rid = str(uuid5(NAMESPACE_URL, f'retag-local-review-demo-{i}'))
                if db.execute('SELECT 1 FROM product_reviews WHERE id=?', (rid,)).fetchone():
                    continue
                now = (datetime.now(timezone.utc) - timedelta(days=i)).isoformat()
                db.execute('INSERT INTO product_reviews(id,product_id,customer_id,purchase_reference,author_label,rating,body,hidden,deleted,reply,version,created_at,updated_at,request_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    (rid, products[i % len(products)][0], f'local-review-demo-{i}', f'SYNTHETIC-NOT-A-PURCHASE-{i}', f'[테스트] 리뷰어 {i+1:02}', rating, '[테스트 리뷰 · 실제 구매 후기 아님] '+body, int(hidden), int(deleted), reply, 0, now, now, 'synthetic-local-review-'+str(i)))
                db.execute('INSERT INTO review_history(review_id,action,reason,actor,snapshot,created_at) VALUES(?,?,?,?,?,?)', (rid, 'created', '로컬 UI 검증용 합성 리뷰', 'local-demo-seed', '{}', now))
                inserted += 1
        print(f'Inserted {inserted} synthetic reviews; existing rows preserved. Local backup created. No stock/order/customer writes.')

if __name__ == '__main__':
    main()
