# [파일 용도] "진짜 사람처럼" 보이는 대규모 더미 데이터를 생성해 SQL 파일로 출력
# [실행] python scripts/generate_dummy_data.py
# [출력] database/seed_dummy_data_realistic.sql
# [적용] psql -U tradediary -d tradediary < database/seed_dummy_data_realistic.sql

"""
생성 전략 (한국 코인 트레이더 통계 반영):
  1) trades 테이블을 먼저 채운다 (BUY+SELL 페어, net=0 보장)
  2) positions는 trades에서 PositionService와 동일한 공식으로 계산
  3) 포지션 결과(pnlRate)를 먼저 결정하고 exit_price를 역산 → PnL 검증 가능
  4) 시간대/가격/수량/승률 분포에 무작위 노이즈 → 인조인간 방지
재현성: SEED 고정으로 매 실행마다 동일한 결과
"""

import math
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP, getcontext
from pathlib import Path
from typing import List

# BigDecimal(30자리)과 동일 정밀도
getcontext().prec = 40

# ============================================================
# 설정
# ============================================================
SEED = 42
NUM_USERS = 30
POSITIONS_PER_USER = 50
JOURNAL_RATIO = 0.55  # 포지션 중 일기 작성 비율

# 기존 seed_test_account.sql의 test 유저 BCrypt 해시 재사용 (비번 'test')
# - 외부 패키지(bcrypt 등) 의존성 없이 유효한 해시 보장
DUMMY_PASSWORD = 'test'
PASSWORD_HASH = '$2a$10$m0KPaeckMT6NxEDRs8/zsex2RVdtlnfnIlx0fuE4NvgcgRLMYIe1G'

# 데이터 기준일 = 스크립트 실행일 정오 (랭킹이 YearMonth.now() 기반이라 항상 이번 달에 맞춰야 함)
# 시각은 정오로 고정 → 같은 날 다시 돌리면 같은 결과 (재현성 유지)
BASE_DATE = datetime.now().replace(hour=12, minute=0, second=0, microsecond=0)
DATE_RANGE_DAYS = 365

# 거래소별 수수료율 (단방향)
FEE_RATE = {
    'UPBIT': 0.0005,    # 0.05%
    'BYBIT': 0.0006,    # 0.06%
    'BITGET': 0.0006,
    'OKX': 0.0006,
    'BINANCE': 0.0005,
    'BINGX': 0.0006,
}

# ============================================================
# 데이터 풀
# ============================================================
# 한국 성씨 + 자연스러운 닉네임 패턴
KOREAN_SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
                   '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍']
KOREAN_GIVEN_NAMES = ['민준', '서연', '도윤', '서준', '하준', '지우', '지호', '예준',
                      '하윤', '시우', '지아', '유준', '지원', '준서', '예원', '민서',
                      '지훈', '현우', '수아', '지유']
EN_NICK_PARTS = ['moon', 'star', 'wolf', 'bear', 'trade', 'chart', 'bull', 'whale',
                 'flow', 'edge', 'zen', 'flux', 'alpha', 'delta', 'pip', 'tick']
EN_NICK_SUFFIX = ['xo', 'lab', 'er', 's', '_kr', '_99', '_io', '77', '0x', 'ist']

# 닉네임 패턴: 한국 이름+태그 / 영문닉 / 일반 별명
NICKNAME_TAGS = ['차트', '단타', '스윙', '현물', '선물', '숏', '롱', '스나이퍼',
                 '헌터', '마스터', '킹', '능력자', '도사', '고수', '지원봇', '연구소']

EMAIL_DOMAINS = ['gmail.com', 'naver.com', 'kakao.com', 'hanmail.net', 'outlook.com']

# ============================================================
# 거래소별 심볼 정의
# ============================================================
# (심볼명, 기준가격, 일간변동성, 연간드리프트, qty 소수점 자리)
# KRW 심볼은 Upbit 전용. USDT 심볼은 BYBIT/BITGET/OKX/BINANCE/BINGX 공용
KRW_SYMBOLS = [
    ('KRW-BTC',   95_000_000, 0.025, 0.30, 5),  # qty 소수점 5자리
    ('KRW-ETH',   3_500_000,  0.030, 0.30, 4),
    ('KRW-SOL',   180_000,    0.045, 0.40, 2),
    ('KRW-XRP',   2_400,      0.040, 0.10, 1),
    ('KRW-DOGE',  280,        0.060, 0.05, 0),
    ('KRW-ADA',   720,        0.045, 0.10, 1),
    ('KRW-AVAX',  38_000,     0.050, 0.20, 2),
    ('KRW-LINK',  18_500,     0.045, 0.15, 2),
    ('KRW-DOT',   7_800,      0.045, 0.10, 2),
    ('KRW-NEAR',  5_200,      0.055, 0.25, 2),
]

USDT_SYMBOLS = [
    ('BTCUSDT',   95_000,     0.025, 0.30, 4),
    ('ETHUSDT',   3_500,      0.030, 0.30, 3),
    ('SOLUSDT',   180,        0.045, 0.40, 2),
    ('XRPUSDT',   2.4,        0.040, 0.10, 1),
    ('DOGEUSDT',  0.28,       0.060, 0.05, 0),
    ('ADAUSDT',   0.72,       0.045, 0.10, 1),
    ('AVAXUSDT',  38,         0.050, 0.20, 2),
    ('LINKUSDT',  18.5,       0.045, 0.15, 2),
    ('DOTUSDT',   7.8,        0.045, 0.10, 2),
    ('ARBUSDT',   1.2,        0.060, 0.10, 1),
]

# 거래소별 심볼 매핑
SYMBOLS_BY_EXCHANGE = {
    'UPBIT': KRW_SYMBOLS,
    'BYBIT': USDT_SYMBOLS,
    'BITGET': USDT_SYMBOLS,
    'OKX': USDT_SYMBOLS,
    'BINANCE': USDT_SYMBOLS,
    'BINGX': USDT_SYMBOLS,
}

# 선물(-SWAP suffix) 심볼 매핑 (BYBIT/BITGET/OKX만)
SWAP_SYMBOLS = {'BTCUSDT': 'BTC-USDT-SWAP', 'ETHUSDT': 'ETH-USDT-SWAP', 'SOLUSDT': 'SOL-USDT-SWAP'}

# 시스템 기본 전략 태그 (schema.sql 시드)
SYSTEM_TAGS = ['추세추종', '역추세', '브레이크아웃', '지지/저항', '이평선', '단타', '스윙', '뇌동매매']

# 유저 커스텀 태그 후보 (일부 유저가 자기만의 태그 만듦)
CUSTOM_TAG_POOL = ['뉴스페이', '펀딩빨', '지지반등', '돌파매매', '분할매수', '물타기',
                   '스캘핑', '자동매매', '카피트레이딩', '복구매매', '익절실패', '손절미']

# ============================================================
# 데이터 클래스
# ============================================================
@dataclass
class DummyUser:
    email: str
    nickname: str
    total_assets: Decimal
    diary_public: bool
    created_at: datetime
    win_rate: float            # 개인 승률 (0.25~0.75)
    short_ratio: float         # SHORT 포지션 비율
    exchanges: List[str]       # 사용 거래소 목록
    custom_tags: List[str] = field(default_factory=list)


@dataclass
class Trade:
    exchange: str
    exchange_trade_id: str
    symbol: str
    side: str                  # BUY / SELL
    qty: Decimal
    price: Decimal
    fee: Decimal
    traded_at: datetime


@dataclass
class Position:
    exchange: str
    symbol: str
    side: str                  # LONG / SHORT
    entry_price: Decimal
    exit_price: Decimal
    qty: Decimal
    pnl: Decimal
    pnl_rate: Decimal
    opened_at: datetime
    closed_at: datetime


# ============================================================
# 유틸 함수
# ============================================================
def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def sql_str(s: str) -> str:
    """SQL 문자열 이스케이프 (' → '')"""
    if s is None:
        return 'NULL'
    return "'" + s.replace("'", "''") + "'"


def sql_decimal(d: Decimal) -> str:
    return str(d)


def sql_timestamp(dt: datetime) -> str:
    return f"'{dt.strftime('%Y-%m-%d %H:%M:%S')}'"


def sql_date(dt: datetime) -> str:
    return f"'{dt.strftime('%Y-%m-%d')}'"


def quantize(d: Decimal, places: int) -> Decimal:
    q = Decimal('1e-{}'.format(places)) if places > 0 else Decimal('1')
    return d.quantize(q, rounding=ROUND_HALF_UP)


# ============================================================
# 랜덤 생성 함수 (자연스러운 분포)
# ============================================================
def gen_user_idx_nickname(idx: int) -> str:
    """패턴 혼합으로 자연스러운 닉네임 생성"""
    pattern = random.random()
    if pattern < 0.45:
        # 한국 성+이름 + 태그
        surname = random.choice(KOREAN_SURNAMES)
        given = random.choice(KOREAN_GIVEN_NAMES)
        tag = random.choice(NICKNAME_TAGS)
        return f'{surname}{given}_{tag}'
    elif pattern < 0.75:
        # 영문 닉네임
        a = random.choice(EN_NICK_PARTS)
        b = random.choice(EN_NICK_PARTS)
        suffix = random.choice(EN_NICK_SUFFIX)
        return f'{a}{b}{suffix}'
    elif pattern < 0.90:
        # 한국 일반 별명
        return random.choice(['차트능력자', '비트코인전사', '알트코인수집가', '단타의정석',
                              '스윙쟁이', '할매추세', '무릎매수', '참는자', '보석수집가',
                              '테슬랑', '문아저씨', '소도제작가', '꼬마트레이더', '흑두루미'])
    else:
        # 성 + 짧은 영문
        surname = random.choice(KOREAN_SURNAMES)
        nick = random.choice(EN_NICK_PARTS)
        return f'{surname}{nick}'


def gen_email(local_hint: str) -> str:
    domain = random.choice(EMAIL_DOMAINS)
    # 자연스러운 로컬파트
    style = random.random()
    if style < 0.4:
        local = local_hint.lower()
    elif style < 0.7:
        local = local_hint.lower() + str(random.randint(1, 999))
    else:
        local = ''.join(random.choice('abcdefghijklmnopqrstuvwxyz0123456789')
                        for _ in range(random.randint(6, 10)))
    return f'dummy_{local}@{domain}'


def gen_total_assets() -> Decimal:
    """로그정규분포로 자연스러운 자산 (대부분 소액, 일부 고액)"""
    assets = random.lognormvariate(math.log(5_000_000), 1.0)  # 중앙값 ~500만 원
    assets = clamp(assets, 200_000, 200_000_000)
    return Decimal(str(round(assets, 2)))


def gen_user(idx: int) -> DummyUser:
    nickname = gen_user_idx_nickname(idx)
    email = gen_email(f'user{idx:02d}')
    created_at = BASE_DATE - timedelta(days=random.randint(180, DATE_RANGE_DAYS))
    created_at = created_at.replace(
        hour=random.randint(6, 23), minute=random.randint(0, 59),
        second=random.randint(0, 59))

    # 승률: 정규분포 0.50 ± 0.10, 극단값은 적게
    win_rate = clamp(random.gauss(0.50, 0.10), 0.25, 0.75)
    # SHORT 비율: 대부분 낮음 (한국 현물 중심)
    short_ratio = clamp(random.gauss(0.18, 0.10), 0.0, 0.45)

    # 거래소 배정: Upbit 가중 50%
    n_exchanges = random.choices([1, 2, 3], weights=[70, 25, 5])[0]
    if random.random() < 0.5:
        # Upbit 우선
        primary = 'UPBIT'
        others = ['BYBIT', 'BITGET', 'OKX', 'BINANCE', 'BINGX']
    else:
        primary = random.choice(['BYBIT', 'BITGET', 'OKX', 'BINANCE', 'BINGX'])
        others = [e for e in ['UPBIT', 'BYBIT', 'BITGET', 'OKX', 'BINANCE', 'BINGX']
                  if e != primary]
    exchanges = [primary] + random.sample(others, min(n_exchanges - 1, len(others)))

    # 일부 유저만 커스텀 태그
    custom_tags = []
    if random.random() < 0.6:
        n_tags = random.randint(1, 3)
        custom_tags = random.sample(CUSTOM_TAG_POOL, n_tags)

    diary_public = random.random() < 0.65

    return DummyUser(
        email=email, nickname=nickname,
        total_assets=gen_total_assets(), diary_public=diary_public,
        created_at=created_at, win_rate=win_rate, short_ratio=short_ratio,
        exchanges=exchanges, custom_tags=custom_tags,
    )


def gen_kst_datetime() -> datetime:
    """1년 범위 내 무작위 일자 + 한국 시간대 가중치"""
    day_offset = random.randint(0, DATE_RANGE_DAYS - 1)
    base = BASE_DATE - timedelta(days=day_offset)
    return base.replace(hour=weighted_hour(), minute=random.randint(0, 59),
                        second=random.randint(0, 59))


def weighted_hour() -> int:
    """한국 시간대 가중치: 08-16(60%), 17-22(25%), 23-07(15%)"""
    r = random.random() * 100
    if r < 60:
        return random.randint(8, 16)
    elif r < 85:
        return random.randint(17, 22)
    else:
        return random.choice([23] + list(range(0, 8)))


def gen_position_times(user: DummyUser, n_positions: int) -> List[datetime]:
    """시각 분포: 가입일 ~ BASE_DATE 근처.
    최근 30일 내 6~12개를 명시적으로 보장 → 모든 유저가 랭킹 집계월(MIN_TRADES=5) 충족.
    시각은 shuffle해서 반환 → main에서 처음 N개만 써도 6월이 골고루 포함됨."""
    # 마지막 포지션: BASE_DATE - random(0, 10) 일
    last_time = BASE_DATE - timedelta(days=random.randint(0, 10),
                                       hours=random.randint(0, 12))
    # 첫 포지션: max(가입일+1~7일, BASE_DATE - random(180, 330) 일)
    earliest = max(
        user.created_at + timedelta(days=random.randint(1, 7)),
        BASE_DATE - timedelta(days=random.randint(180, 330)),
    )
    if earliest >= last_time:
        earliest = last_time - timedelta(days=random.randint(150, 200))

    # 최근 30일 구간 (이번 달 랭킹 집계 보장용)
    recent_start = last_time - timedelta(days=30)
    if recent_start <= earliest:
        # 가입일이 너무 최근이면 구간을 60% 지점으로
        recent_start = earliest + (last_time - earliest) * 0.6

    # 최근 30일 내 10~16개 (랭킹 MIN_TRADES=5 + 여유, 대다수 유저 랭킹 진입)
    recent_count = random.randint(10, 16)
    past_count = max(0, n_positions - recent_count)

    def scatter(n: int, t0: datetime, t1: datetime) -> List[datetime]:
        """t0~t1 구간에 n개 시각을 균등+노이즈로 분산. 시/분/초는 한국 시간대 가중치."""
        if n <= 0 or t1 <= t0:
            return []
        span = (t1 - t0).total_seconds()
        out = []
        for i in range(n):
            progress = (i + random.random()) / n
            t = t0 + timedelta(seconds=progress * span)
            t = t.replace(hour=weighted_hour(), minute=random.randint(0, 59),
                          second=random.randint(0, 59))
            out.append(t)
        return out

    past_times = scatter(past_count, earliest, recent_start)
    recent_times = scatter(recent_count, recent_start, last_time)

    all_times = past_times + recent_times
    random.shuffle(all_times)  # 순서 섞기 → main에서 처음 N개 써도 6월 골고루 포함
    return all_times


def gen_price(symbol_info: tuple, day_offset_from_now: int) -> Decimal:
    """기준가 + 연간드리프트 + 가우시안 노이즈 → 통화별 precision"""
    name, base, vol, trend, _ = symbol_info
    # 과거 일수만큼 드리프트 역산 (과거일수록 저렴하게, trend > 0)
    drift = 1 - trend * (day_offset_from_now / 365.0)
    noise = random.gauss(0, vol)
    raw = base * drift * (1 + noise)
    if raw <= 0:
        raw = base * 0.5

    is_krw = name.startswith('KRW-')
    if is_krw:
        # 원화: 소수점 2자리 (센티미세 변동)
        return Decimal(str(round(raw, 2)))
    else:
        if raw < 1:
            return Decimal(str(round(raw, 8)))
        if raw < 100:
            return Decimal(str(round(raw, 4)))
        return Decimal(str(round(raw, 2)))


def gen_total_qty(symbol_info: tuple, price: Decimal, exchange: str) -> Decimal:
    """목표 주문가치 → 수량. 로그정규분포로 소액~대액"""
    _, _, _, _, qty_places = symbol_info
    # 목표 주문 가치 (원화 기준)
    target_krw = random.lognormvariate(math.log(500_000), 0.85)
    target_krw = clamp(target_krw, 30_000, 30_000_000)

    if exchange == 'UPBIT':
        target_value = Decimal(str(target_krw))
    else:
        # USDT 거래소: KRW→USDT 환산 (~1300원/USDT)
        target_value = Decimal(str(target_krw)) / Decimal('1300')

    raw_qty = target_value / price
    return quantize(raw_qty, qty_places)


def split_qty(total_qty: Decimal, n_splits: int, qty_places: int) -> List[Decimal]:
    """총수량을 n_splits 개로 분할. 마지막은 나머지로 정확히 합 일치"""
    if n_splits <= 1:
        return [total_qty]
    ratios = [random.uniform(0.25, 0.70) for _ in range(n_splits)]
    s = sum(ratios)
    ratios = [r / s for r in ratios]

    parts = []
    for r in ratios[:-1]:
        parts.append(quantize(total_qty * Decimal(str(r)), qty_places))
    # 마지막: 전체에서 합 정확히 맞춤 (부동소수점 오차 회피)
    last = total_qty - sum(parts)
    parts.append(quantize(last, qty_places))
    return parts


def gen_pnl_rate(win_rate: float):
    """포지션 결과 결정. (is_win, pnl_rate%)"""
    is_win = random.random() < win_rate
    if is_win:
        # 승: 수익률 분포 (대부분 1~7%, 드물게 큰 수익)
        rate = abs(random.gauss(3.5, 2.2))
        rate = clamp(rate, 0.1, 25)
    else:
        # 패: 손실률 분포 (손실은 보다 작게, 손절 관행)
        rate = -abs(random.gauss(2.6, 1.6))
        rate = clamp(rate, -18, -0.1)
    return is_win, rate


def build_position_trades(user: DummyUser, exchange: str, opened_at: datetime,
                          trade_id_counter: List[int]) -> tuple:
    """단일 포지션의 trades 생성 + side/계산용 메타 반환"""
    # 심볼 선택
    symbol_pool = SYMBOLS_BY_EXCHANGE[exchange]
    symbol_info = random.choice(symbol_pool)
    symbol_name = symbol_info[0]
    qty_places = symbol_info[4]

    # 선물 심볼 처리 (BYBIT/BITGET/OKX, 30% 확률로 -SWAP)
    actual_symbol = symbol_name
    if exchange in ('BYBIT', 'BITGET', 'OKX') and random.random() < 0.30:
        if symbol_name in SWAP_SYMBOLS:
            actual_symbol = SWAP_SYMBOLS[symbol_name]

    side = 'LONG' if random.random() > user.short_ratio else 'SHORT'
    is_win, pnl_rate_pct = gen_pnl_rate(user.win_rate)

    # opened_at 기준 가격
    days_from_now = (BASE_DATE - opened_at).days
    entry_price = gen_price(symbol_info, days_from_now)

    # exit_price 역산: pnl_rate는 cost(entry*qty) 기준이지만 근사적으로 price 변동률로 사용
    rate_decimal = Decimal(str(pnl_rate_pct / 100.0))
    if side == 'LONG':
        # LONG 승: exit > entry / LONG 패: exit < entry (pnl_rate 부호가 이미 반영)
        exit_price_raw = entry_price * (Decimal('1') + rate_decimal)
    else:
        # SHORT: entry↔exit 반대
        exit_price_raw = entry_price * (Decimal('1') - rate_decimal)
    exit_price_raw = exit_price_raw if exit_price_raw > 0 else entry_price * Decimal('0.5')

    # 수량
    total_qty = gen_total_qty(symbol_info, entry_price, exchange)
    if total_qty <= 0:
        total_qty = Decimal('0.001')

    # 분할 진입 (25% 확률)
    n_entry_splits = 1 if random.random() > 0.25 else random.randint(2, 3)
    entry_qty_parts = split_qty(total_qty, n_entry_splits, qty_places)

    # 진입 side 결정
    entry_side = 'BUY' if side == 'LONG' else 'SELL'
    exit_side = 'SELL' if side == 'LONG' else 'BUY'

    fee_rate = Decimal(str(FEE_RATE[exchange]))
    trades: List[Trade] = []

    # ── 진입 거래 ─────────────────────────────
    cur_time = opened_at
    for i, q in enumerate(entry_qty_parts):
        if i > 0:
            cur_time = cur_time + timedelta(minutes=random.randint(10, 240))
        # 분할 진입 시 가격 약간 변동 (평단가 조절 흉내)
        p = entry_price * (Decimal('1') + Decimal(str(random.gauss(0, 0.004) * i)))
        p = quantize(p, 8 if not actual_symbol.startswith('KRW-') else 2)
        fee = quantize(p * q * fee_rate, 8)
        trade_id_counter[0] += 1
        trades.append(Trade(
            exchange=exchange,
            exchange_trade_id=f'dummy-{exchange.lower()}-{trade_id_counter[0]:07d}',
            symbol=actual_symbol, side=entry_side, qty=q, price=p, fee=fee,
            traded_at=cur_time,
        ))

    # ── 보유 시간 ─────────────────────────────
    hold_min = int(random.lognormvariate(math.log(720), 0.9))  # 중앙값 12시간
    hold_min = clamp(hold_min, 5, 7 * 24 * 60)  # 5분 ~ 7일
    exit_start = cur_time + timedelta(minutes=hold_min)
    # exit_start가 BASE_DATE 이후면 clamp
    if exit_start > BASE_DATE:
        exit_start = cur_time + timedelta(minutes=random.randint(30, 600))

    # ── 청산 거래 ─────────────────────────────
    # 청산은 주로 1회, 20% 확률로 2회 분할
    n_exit_splits = 2 if random.random() < 0.20 else 1
    exit_qty_parts = split_qty(total_qty, n_exit_splits, qty_places)

    cur_time = exit_start
    for i, q in enumerate(exit_qty_parts):
        if i > 0:
            cur_time = cur_time + timedelta(minutes=random.randint(5, 90))
        p = exit_price_raw * (Decimal('1') + Decimal(str(random.gauss(0, 0.003) * i)))
        p = quantize(p, 8 if not actual_symbol.startswith('KRW-') else 2)
        fee = quantize(p * q * fee_rate, 8)
        trade_id_counter[0] += 1
        trades.append(Trade(
            exchange=exchange,
            exchange_trade_id=f'dummy-{exchange.lower()}-{trade_id_counter[0]:07d}',
            symbol=actual_symbol, side=exit_side, qty=q, price=p, fee=fee,
            traded_at=cur_time,
        ))

    # 시간순 정렬 (분할이 섞일 경우 대비)
    trades.sort(key=lambda t: t.traded_at)
    return trades, side, actual_symbol


# ============================================================
# 포지션 계산 (PositionService.savePosition 복제)
# ============================================================
def calc_position_from_trades(trades: List[Trade], side: str) -> Position:
    entry_side = 'BUY' if side == 'LONG' else 'SELL'
    entry_trades = [t for t in trades if t.side == entry_side]
    exit_trades = [t for t in trades if t.side != entry_side]

    def sum_qty(ts):
        return sum((t.qty for t in ts), Decimal('0'))

    def sum_value(ts):
        return sum((t.price * t.qty for t in ts), Decimal('0'))

    qty = sum_qty(entry_trades)
    entry_value = sum_value(entry_trades)
    entry_price = (entry_value / qty).quantize(Decimal('1e-10'), rounding=ROUND_HALF_UP) \
        if qty > 0 else Decimal('0')

    exit_qty = sum_qty(exit_trades)
    exit_value = sum_value(exit_trades)
    exit_price = (exit_value / exit_qty).quantize(Decimal('1e-10'), rounding=ROUND_HALF_UP) \
        if exit_qty > 0 else Decimal('0')

    fees = sum((t.fee for t in trades), Decimal('0'))

    # PnL
    if side == 'LONG':
        price_diff = exit_price - entry_price
    else:
        price_diff = entry_price - exit_price
    pnl = price_diff * qty - fees

    # pnlRate = pnl / (entryPrice * qty) * 100, scale=6 → ×100 → scale=4
    cost = entry_price * qty
    if cost > 0:
        ratio = (pnl / cost).quantize(Decimal('1e-6'), rounding=ROUND_HALF_UP)
        pnl_rate = (ratio * Decimal('100')).quantize(Decimal('1e-4'), rounding=ROUND_HALF_UP)
    else:
        pnl_rate = Decimal('0')

    opened_at = min(t.traded_at for t in trades)
    closed_at = max(t.traded_at for t in trades)

    return Position(
        exchange=trades[0].exchange, symbol=trades[0].symbol, side=side,
        entry_price=entry_price, exit_price=exit_price, qty=qty,
        pnl=pnl, pnl_rate=pnl_rate, opened_at=opened_at, closed_at=closed_at,
    )


# ============================================================
# 매매 일기 생성 (포지션 결과와 일치)
# ============================================================
# (승패, pnl_rate 구간, side) → (감정, 진입이유, 청산이유, 메모) 텍스트 풀
JOURNAL_TEMPLATES = {
    'big_win': [
        ('CONFIDENT', '4시간봉 지지선 반등 + 거래량 동반 증가 확인. 추세 전환 시그널',
         '목표가 도달 후 익절. 추가 상승 여력 남았으나 계획대로 확정',
         '계획대로 깔끔하게 떨어졌다. 진입 타이밍 좋았음.'),
        ('CALM', '일봉 캔들 반전 패턴 + RSI 과매도 구간 이탈. 분할 매수로 진입',
         '수익률 목표 도달. 거래량 줄어들어 익절',
         '감정 흔들림 없이 계획 실행. 분할 매수 효과 좋았음.'),
        ('CONFIDENT', '주봉 지지선 도달 + 펀딩레이트 정상화. 중기 상승 추세 내 조정 매수',
         '돌파 후 재테스트 성공. 추가 상승 확신 익절',
         '근거가 뚜렷해서 홀딩하기 편했다.'),
    ],
    'small_win': [
        ('CALM', '1시간봉 이평선 정배열 전환. 단기 모멘텀',
         '단기 목표 도달 익절. 뒤늦게 더 갔지만 계획 지킴',
         '작지만 확실하게. 잦은 단타로 적립.'),
        ('CONFIDENT', '거래량 급증 + 돌파 시도. 모멘텀 타기',
         '첫 번째 저항 도달 전 익절',
         '빠르게 빠져나왔다. 타점 나쁘지 않았음.'),
        ('CALM', '전일 고가 돌파 시도. 브레이크아웃 매수',
         '돌파 실패 직전에 익절',
         '애매한 구간이라 빠르게 정리.'),
    ],
    'small_loss': [
        ('ANXIOUS', '커뮤니티 호재 떡밥 + 거래량 증가. 모멘텀 타려다 진입',
         '예상과 달리 반대 방향. 손절가 도달해 정리',
         'FOMO 건 했다. 떡밥에 속지 말자.'),
        ('ANXIOUS', '상승 추세 따라 매수. 추격 매수',
         '추세 꺾임. 지지선 이탈로 손절',
         '타점이 늦었다. 추격은 위험하다.'),
        ('FEARFUL', '돌파 매수 시도. 거래량 동반',
         '가짜 돌파. 손절',
         '돌파 매수는 역시 위험하다.'),
    ],
    'big_loss': [
        ('GREEDY', '강한 상승세. 추가 상승 기대 추격',
         '급락 시작. 손절가 터질 때까지 버티다가 정리',
         '너무 욕심 부렸다. 손절을 일찍 했어야.'),
        ('FEARFUL', '물린 포지션 물타기. 평단 낮추기 시도',
         '계속 하락. 결국 대손실로 청산',
         '물타기가 아니라 빠져나갔어야 했다. 뻔뻔하게 버틴 결과.'),
        ('ANXIOUS', 'FOMO 진입. 놓치면 안 될 것 같아서',
         '진입 직후 하락. 손절 못 하다가 결국 큰 손실',
         '감정이 앞섰다. 내일은 쉬어야겠다.'),
    ],
}


def gen_journal_content(position: Position) -> tuple:
    """포지션 결과에 맞는 (emotion, entry_reason, exit_reason, memo)"""
    rate = float(position.pnl_rate)
    is_win = rate > 0

    if is_win and rate >= 5.0:
        key = 'big_win'
    elif is_win:
        key = 'small_win'
    elif rate <= -5.0:
        key = 'big_loss'
    else:
        key = 'small_loss'

    emotion, entry, exit_r, memo = random.choice(JOURNAL_TEMPLATES[key])
    return emotion, entry, exit_r, memo


def pick_journal_tags(position: Position, user: DummyUser) -> List[str]:
    """포지션에서 전략 태그 1~2개 선택 (시스템 + 유저 커스텀 혼합)"""
    is_win = float(position.pnl_rate) > 0
    pool = list(SYSTEM_TAGS)
    if user.custom_tags:
        pool += user.custom_tags

    # 결과에 따른 가중치
    weights = []
    for tag in pool:
        if is_win and tag in ('추세추종', '브레이크아웃', '돌파매매', '이평선'):
            weights.append(3)
        elif not is_win and tag in ('역추세', '뇌동매매', '물타기', '익절실패'):
            weights.append(3)
        elif tag in ('단타', '스캘핑', '분할매수'):
            weights.append(2)
        else:
            weights.append(1)

    n_tags = random.choices([1, 2], weights=[60, 40])[0]
    n_tags = min(n_tags, len(pool))
    selected = random.choices(pool, weights=weights, k=n_tags)
    # 중복 제거
    seen = set()
    unique = []
    for t in selected:
        if t not in seen:
            seen.add(t)
            unique.append(t)
    return unique


# ============================================================
# SQL 출력
# ============================================================
TRADES_HEADER = 'INSERT INTO trades (user_id, exchange, exchange_trade_id, symbol, side, qty, price, fee, traded_at, created_at) VALUES'
POSITIONS_HEADER = 'INSERT INTO positions (user_id, exchange, symbol, side, entry_price, exit_price, qty, pnl, pnl_rate, opened_at, closed_at, created_at) VALUES'
JOURNALS_HEADER = 'INSERT INTO trade_journals (user_id, position_id, trade_date, symbol, entry_reason, exit_reason, emotion, memo, created_at, updated_at) VALUES'

BATCH = 200


def emit_batch(lines, header, rows):
    """200행 단위로 INSERT 문 반복 출력. 헤더는 매 batch마다 반복."""
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        lines.append(header)
        lines.append(',\n'.join(chunk) + ';')
        lines.append('')


def render_sql(users, all_trades_by_user, all_positions_by_user,
               journals_by_user, custom_tags_by_user, output_path: Path):
    lines = []
    L = lines.append

    L('-- [파일 용도] 진짜 사람처럼 보이는 대규모 더미 데이터 (Python 스크립트로 자동 생성)')
    L('-- 비밀번호: test (모든 더미 유저 공통)')
    L('-- 실행: docker exec -i tradediary-postgres psql -U tradediary -d tradediary < database/seed_dummy_data_realistic.sql')
    L('')
    L('-- 한글 깨짐 방지: psql이 입력 스트림을 UTF-8로 해석 (PowerShell 파이프 깨짐 방어)')
    L("SET client_encoding TO 'UTF8';")
    L('')
    L('BEGIN;')
    L('')

    # ── 기존 더미 삭제 (FK 역순) ───────────────
    L('-- =============================================')
    L('-- 기존 더미 데이터 삭제 (email LIKE dummy_% 로 안전 분리)')
    L('-- =============================================')
    L("DELETE FROM journal_strategy_tags WHERE journal_id IN (SELECT id FROM trade_journals WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'dummy_%'));")
    L("DELETE FROM trade_journals   WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'dummy_%');")
    L("DELETE FROM strategy_tags    WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'dummy_%');")
    L("DELETE FROM positions        WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'dummy_%');")
    L("DELETE FROM trades           WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'dummy_%');")
    L("DELETE FROM exchange_keys    WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'dummy_%');")
    L("DELETE FROM refresh_tokens   WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'dummy_%');")
    L("DELETE FROM users            WHERE email LIKE 'dummy_%';")
    L('')

    # ── users ─────────────────────────────────
    L('-- =============================================')
    L('-- 더미 유저')
    L('-- =============================================')
    L('INSERT INTO users (email, password, nickname, total_assets, diary_public, created_at, updated_at) VALUES')
    user_rows = [
        f"({sql_str(u.email)}, {sql_str(PASSWORD_HASH)}, {sql_str(u.nickname)}, "
        f"{sql_decimal(u.total_assets)}, {'TRUE' if u.diary_public else 'FALSE'}, "
        f"{sql_timestamp(u.created_at)}, {sql_timestamp(u.created_at)})"
        for u in users
    ]
    L(',\n'.join(user_rows) + ';')
    L('')

    # ── exchange_keys ─────────────────────────
    L('-- =============================================')
    L('-- 거래소 연동 키 (더미 암호화값. UI에서 등록 거래소 표시용)')
    L('-- =============================================')
    L('INSERT INTO exchange_keys (user_id, exchange, api_key, secret_key, is_active, created_at) VALUES')
    ek_rows = []
    for u in users:
        local_part = u.email.split('@')[0]
        for ex in u.exchanges:
            ek_rows.append(
                f"((SELECT id FROM users WHERE email={sql_str(u.email)}), {sql_str(ex)}, "
                f"{sql_str('dummyenc-' + local_part + '-' + ex.lower() + '-apikey')}, "
                f"{sql_str('dummyenc-' + local_part + '-' + ex.lower() + '-secretkey')}, "
                f"TRUE, {sql_timestamp(u.created_at)})")
    L(',\n'.join(ek_rows) + ';')
    L('')

    # ── trades ───────────────────────────────
    L('-- =============================================')
    L('-- 거래 원본 내역 (BUY+SELL 페어, net=0)')
    L('-- =============================================')
    trade_rows = []
    for u in users:
        for t in all_trades_by_user[id(u)]:
            trade_rows.append(
                f"((SELECT id FROM users WHERE email={sql_str(u.email)}), {sql_str(t.exchange)}, "
                f"{sql_str(t.exchange_trade_id)}, {sql_str(t.symbol)}, {sql_str(t.side)}, "
                f"{sql_decimal(t.qty)}, {sql_decimal(t.price)}, {sql_decimal(t.fee)}, "
                f"{sql_timestamp(t.traded_at)}, NOW())")
    emit_batch(lines, TRADES_HEADER, trade_rows)

    # ── positions ─────────────────────────────
    L('-- =============================================')
    L('-- 포지션 (trades에서 PositionService와 동일 공식으로 계산)')
    L('-- =============================================')
    pos_rows = []
    for u in users:
        for p in all_positions_by_user[id(u)]:
            pos_rows.append(
                f"((SELECT id FROM users WHERE email={sql_str(u.email)}), {sql_str(p.exchange)}, "
                f"{sql_str(p.symbol)}, {sql_str(p.side)}, {sql_decimal(p.entry_price)}, "
                f"{sql_decimal(p.exit_price)}, {sql_decimal(p.qty)}, {sql_decimal(p.pnl)}, "
                f"{sql_decimal(p.pnl_rate)}, {sql_timestamp(p.opened_at)}, "
                f"{sql_timestamp(p.closed_at)}, NOW())")
    emit_batch(lines, POSITIONS_HEADER, pos_rows)

    # ── strategy_tags (유저 커스텀) ─────────
    L('-- =============================================')
    L('-- 전략 태그 (시스템 기본 8개는 schema.sql 시드, 여기선 유저 커스텀만)')
    L('-- =============================================')
    tag_rows = []
    for u in users:
        for tag_name in custom_tags_by_user[id(u)]:
            color = random.choice(['#00d4aa', '#ff6b6b', '#4ecdc4', '#ffe66d',
                                   '#a78bfa', '#f59e0b', '#10b981', '#ef4444'])
            tag_rows.append(
                f"((SELECT id FROM users WHERE email={sql_str(u.email)}), "
                f"{sql_str(tag_name)}, {sql_str(color)}, NOW())")
    if tag_rows:
        L('INSERT INTO strategy_tags (user_id, name, color, created_at) VALUES')
        L(',\n'.join(tag_rows) + ';')
        L('')

    # ── trade_journals ───────────────────────
    L('-- =============================================')
    L('-- 매매 일기 (포지션의 일부만 작성)')
    L('-- 주의: trade_journals 테이블에는 exchange 컬럼 없음 (엔티티에만 매핑)')
    L('-- =============================================')
    journal_rows = []
    for u in users:
        user_id_subq = f"(SELECT id FROM users WHERE email={sql_str(u.email)})"
        for j in journals_by_user[id(u)]:
            position, emotion, entry_r, exit_r, memo, created, tags = j
            position_id_subq = (
                f"(SELECT id FROM positions WHERE user_id={user_id_subq} "
                f"AND symbol={sql_str(position.symbol)} "
                f"AND opened_at={sql_timestamp(position.opened_at)} LIMIT 1)")
            journal_rows.append(
                f"({user_id_subq}, {position_id_subq}, "
                f"{sql_date(position.opened_at)}, {sql_str(position.symbol)}, "
                f"{sql_str(entry_r)}, {sql_str(exit_r)}, {sql_str(emotion)}, {sql_str(memo)}, "
                f"{sql_timestamp(created)}, {sql_timestamp(created)})")
    emit_batch(lines, JOURNALS_HEADER, journal_rows)

    # ── journal_strategy_tags ────────────────
    L('-- =============================================')
    L('-- 일기 ↔ 전략태그 매핑')
    L('-- =============================================')
    jst_inserts = []
    for u in users:
        user_id_subq = f"(SELECT id FROM users WHERE email={sql_str(u.email)})"
        for j in journals_by_user[id(u)]:
            position, emotion, entry_r, exit_r, memo, created, tags = j
            # position_id로 정확히 하나의 저널만 매칭 (같은 날 같은 심볼의 다른 포지션과 충돌 방지)
            position_id_subq = (
                f"(SELECT id FROM positions WHERE user_id={user_id_subq} "
                f"AND symbol={sql_str(position.symbol)} "
                f"AND opened_at={sql_timestamp(position.opened_at)} LIMIT 1)")
            for tag_name in tags:
                jst_inserts.append(
                    f"INSERT INTO journal_strategy_tags (journal_id, tag_id) "
                    f"SELECT j.id, t.id FROM trade_journals j, strategy_tags t "
                    f"WHERE j.position_id={position_id_subq} "
                    f"AND t.name={sql_str(tag_name)} "
                    f"AND (t.user_id={user_id_subq} OR t.user_id IS NULL) "
                    f"ON CONFLICT (journal_id, tag_id) DO NOTHING;")
    if jst_inserts:
        for stmt in jst_inserts:
            L(stmt)
        L('')

    L('COMMIT;')
    L('')

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text('\n'.join(lines), encoding='utf-8')


# ============================================================
# 메인
# ============================================================
def main():
    random.seed(SEED)

    # 1) 유저 생성
    users = [gen_user(i) for i in range(NUM_USERS)]

    # 유저별 데이터 컨테이너
    all_trades_by_user = {id(u): [] for u in users}
    all_positions_by_user = {id(u): [] for u in users}
    custom_tags_by_user = {id(u): list(u.custom_tags) for u in users}
    journals_by_user = {id(u): [] for u in users}

    trade_id_counter = [0]  # mutable counter via list

    # 2) 각 유저의 포지션 + 거래 생성
    #    시각 분포: 가입일 ~ BASE_DATE 근처, 최근 편향 → 모든 유저가 이번 달에 활동 중
    for u in users:
        # 50개 + 여유분(10개) 시각 미리 생성 → net=0 스킵 대비
        candidate_times = gen_position_times(u, POSITIONS_PER_USER + 10)
        positions_created = 0

        for candidate_open in candidate_times:
            if positions_created >= POSITIONS_PER_USER:
                break

            # 거래소 선택 (유저의 거래소 중 1개)
            exchange = random.choice(u.exchanges)

            trades, side, symbol = build_position_trades(
                u, exchange, candidate_open, trade_id_counter)

            # 검증: net = 0 (진입 수량 합 == 청산 수량 합)
            entry_side = 'BUY' if side == 'LONG' else 'SELL'
            entry_qty = sum((t.qty for t in trades if t.side == entry_side), Decimal('0'))
            exit_qty = sum((t.qty for t in trades if t.side != entry_side), Decimal('0'))
            if abs(entry_qty - exit_qty) > Decimal('0.0001'):
                continue  # net=0 아니면 스킵

            position = calc_position_from_trades(trades, side)
            all_trades_by_user[id(u)].extend(trades)
            all_positions_by_user[id(u)].append(position)
            positions_created += 1

    # 3) 매매 일기 생성
    for u in users:
        positions = all_positions_by_user[id(u)]
        # 일기 작성 포지션 수
        n_journals = int(len(positions) * JOURNAL_RATIO)
        # 최근 포지션 위주로 (사람은 최근 일기를 더 자주 씀)
        sampled = random.sample(positions, min(n_journals, len(positions)))

        for position in sampled:
            emotion, entry_r, exit_r, memo = gen_journal_content(position)
            tags = pick_journal_tags(position, u)
            # 작성 시각: 포지션 종료 후 1~48시간 내
            created = position.closed_at + timedelta(hours=random.randint(1, 48))
            if created > BASE_DATE:
                created = position.closed_at + timedelta(minutes=random.randint(10, 600))
            journals_by_user[id(u)].append(
                (position, emotion, entry_r, exit_r, memo, created, tags))

    # 4) SQL 출력
    output_path = Path(__file__).resolve().parent.parent / 'database' / 'seed_dummy_data_realistic.sql'
    render_sql(users, all_trades_by_user, all_positions_by_user,
               journals_by_user, custom_tags_by_user, output_path)

    # 5) 요약 통계
    total_trades = sum(len(all_trades_by_user[id(u)]) for u in users)
    total_positions = sum(len(all_positions_by_user[id(u)]) for u in users)
    total_journals = sum(len(journals_by_user[id(u)]) for u in users)
    total_tags = sum(len(custom_tags_by_user[id(u)]) for u in users)
    wins = sum(1 for u in users for p in all_positions_by_user[id(u)]
               if float(p.pnl_rate) > 0)
    shorts = sum(1 for u in users for p in all_positions_by_user[id(u)]
                 if p.side == 'SHORT')
    user_win_rates = []
    for u in users:
        ps = all_positions_by_user[id(u)]
        if ps:
            wr = sum(1 for p in ps if float(p.pnl_rate) > 0) / len(ps)
            user_win_rates.append(wr)

    print('=' * 60)
    print('더미 데이터 생성 완료')
    print('=' * 60)
    print(f'출력: {output_path}')
    print(f'유저:       {NUM_USERS}명')
    print(f'거래:       {total_trades}행')
    print(f'포지션:     {total_positions}행 (유저당 평균 {total_positions/NUM_USERS:.1f})')
    print(f'매매 일기:  {total_journals}행 ({JOURNAL_RATIO*100:.0f}% 커버)')
    print(f'커스텀 태그: {total_tags}행')
    print(f'')
    print(f'전체 승률:   {wins/total_positions*100:.1f}% ({wins}/{total_positions})')
    print(f'SHORT 비율:  {shorts/total_positions*100:.1f}%')
    print(f'유저별 승률: 평균 {sum(user_win_rates)/len(user_win_rates)*100:.1f}% '
          f'(범위 {min(user_win_rates)*100:.0f}~{max(user_win_rates)*100:.0f}%)')
    print(f'')
    print('적용:')
    print(f'  docker exec -i tradediary-postgres psql -U tradediary -d tradediary < {output_path.name}')
    print(f'  (파일 위치: {output_path.parent}/)')
    print(f'')
    print('더미 유저 로그인 비밀번호: test')


if __name__ == '__main__':
    main()
