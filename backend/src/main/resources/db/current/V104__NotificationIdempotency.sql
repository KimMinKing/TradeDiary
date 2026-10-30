-- [파일 용도] 동일 이벤트의 중복 알림 저장 방지
DELETE FROM notifications older
USING notifications newer
WHERE older.user_id = newer.user_id
  AND older.related_id = newer.related_id
  AND older.id < newer.id;

CREATE UNIQUE INDEX IF NOT EXISTS uk_notifications_user_related
    ON notifications(user_id, related_id);
