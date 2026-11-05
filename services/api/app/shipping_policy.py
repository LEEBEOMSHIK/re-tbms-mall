"""Standard domestic delivery fee on the discounted goods subtotal."""
BASE_FEE = 3_000
FREE_THRESHOLD = 50_000


def standard_fee(goods_total):
    return 0 if goods_total >= FREE_THRESHOLD else BASE_FEE
