-- Stock Check Reports table
-- Stores completed stock check sessions for reporting purposes

CREATE TABLE IF NOT EXISTS stock_check_reports (
    id                    SERIAL PRIMARY KEY,
    check_type            VARCHAR(50) NOT NULL,
    reference_name        VARCHAR(255) NOT NULL,
    total_system_qty      INT NOT NULL DEFAULT 0,
    total_scanned_qty     INT NOT NULL DEFAULT 0,
    total_variance        INT NOT NULL DEFAULT 0,
    items_checked         INT NOT NULL DEFAULT 0,
    items_with_variance   INT NOT NULL DEFAULT 0,
    items_json            JSONB NOT NULL DEFAULT '[]',
    status                VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    notes                 TEXT,
    performed_by_name     VARCHAR(255),
    performed_by_user_id  INT REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_check_reports_check_type ON stock_check_reports(check_type);
CREATE INDEX IF NOT EXISTS idx_stock_check_reports_created_at ON stock_check_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_check_reports_status ON stock_check_reports(status);
