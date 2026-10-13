ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check CHECK (
        type IN (
            'TRADE_EXECUTED',
            'POSITION_OPENED',
            'POSITION_CLOSED',
            'PROFIT_TAKEN',
            'LOSS_CUT',
            'EXCHANGE_CONNECTED',
            'EXCHANGE_DISCONNECTED',
            'MARGIN_WARNING',
            'DAILY_SUMMARY',
            'WEEKLY_SUMMARY',
            'MONTHLY_SUMMARY',
            'AI_REPORT_READY',
            'NEWS_ALERT',
            'SYSTEM_ALERT',
            'FOLLOWER_TRADE'
        )
    );
