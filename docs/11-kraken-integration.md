# Kraken 거래소 연동

TradeDiary는 Kraken Spot의 잔고와 체결 내역 동기화를 지원합니다.

## 필요한 권한

- Funds permissions: `Query Funds`
- Orders & trades permissions: `Query Closed Orders & Trades`
- 출금 권한은 활성화하지 않습니다.

거래소 설정 화면에서 API Key와 Private Key를 등록한 뒤 거래 내역 페이지의 Kraken 탭에서 동기화합니다. Private REST 요청은 Kraken 규격에 따라 nonce와 POST 본문을 SHA-256으로 해시하고 API 경로와 결합한 뒤, Private Key를 이용해 HMAC-SHA-512 서명을 생성합니다.

## 구현 범위

- `/0/private/Balance`: 자산 잔고
- `/0/private/TradesHistory`: 페이지 단위 체결 내역
- API 오류 격리 및 제한된 공용 executor를 사용한 병렬 잔고 조회
- 결정적인 서명 단위 테스트

## 운영 확인

실계정 연결 전 Kraken에서 읽기 전용 키를 생성하고 IP 제한을 권장합니다. 라이브 검증은 계정 권한이 필요한 별도 운영 단계이며, 저장소 테스트에서는 실제 키나 네트워크 호출을 사용하지 않습니다.
