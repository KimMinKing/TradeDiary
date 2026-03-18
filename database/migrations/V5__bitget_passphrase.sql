-- [마이그레이션] Bitget 연동을 위한 passphrase 컬럼 추가
-- Bitget은 apiKey, secretKey 외에 passphrase가 추가로 필요

ALTER TABLE exchange_keys
    ADD COLUMN IF NOT EXISTS passphrase VARCHAR(512);
