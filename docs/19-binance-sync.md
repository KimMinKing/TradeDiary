# Binance USDⓈ-M 체결 동기화 범위

Binance 연결은 `/fapi/v1/income`에서 거래된 심볼을 찾고, 심볼별 `/fapi/v1/userTrades`에서 체결을 가져옵니다. 두 API가 제공하는 이력은 최근 3개월로 제한됩니다. 그 이전 체결은 현재 API 동기화로 복구할 수 없으며, 별도 과거 내역 가져오기 기능이 필요합니다.

`income`은 고정된 시작·종료 시각과 `page`로 넘깁니다. 체결 목록은 API의 최대 7일 조회 범위로 나누고, 1,000건으로 가득 찬 구간을 시각 기준으로 다시 분할합니다. `userTrades`의 `fromId`는 `startTime`/`endTime`과 함께 보낼 수 없습니다. 1밀리초에 체결이 1,000건 이상 모여 더 이상 분할할 수 없으면 조용히 일부를 건너뛰지 않고 동기화를 실패로 처리합니다.

체결 중복 제거 키는 `심볼:체결ID`입니다. V117 마이그레이션이 이전 숫자 ID로 저장된 Binance 거래를 같은 형식으로 변경합니다.

- [Binance Get Income History](https://developers.binance.com/en/docs/catalog/core-trading-derivatives-trading-usd-s-m-futures/api/rest-api/account)
- [Binance Account Trade List](https://developers.binance.com/en/docs/catalog/core-trading-derivatives-trading-usd-s-m-futures/api/rest-api/trade)
