CREATE TABLE exchange_sync_coverage (
    exchange_sync_state_id BIGINT NOT NULL REFERENCES exchange_sync_state(id) ON DELETE CASCADE,
    product_type VARCHAR(32) NOT NULL,
    requested_from TIMESTAMP NOT NULL,
    available_from TIMESTAMP NOT NULL,
    verified_through TIMESTAMP NOT NULL,
    last_checked_at TIMESTAMP NOT NULL,
    coverage_status VARCHAR(32) NOT NULL,
    PRIMARY KEY (exchange_sync_state_id, product_type),
    CONSTRAINT chk_sync_coverage_status CHECK (coverage_status IN ('REQUESTED_RANGE_CHECKED', 'LIMITED_BY_EXCHANGE')),
    CONSTRAINT chk_sync_coverage_range CHECK (requested_from <= available_from AND available_from <= verified_through)
);

CREATE INDEX idx_sync_coverage_state ON exchange_sync_coverage(exchange_sync_state_id);
