-- Abilita realtime per la tabella delivery_notifications
ALTER TABLE delivery_notifications REPLICA IDENTITY FULL;

-- Aggiungi colonna telegram_chat_id ai deliverers
ALTER TABLE deliverers ADD COLUMN IF NOT EXISTS telegram_chat_id text;