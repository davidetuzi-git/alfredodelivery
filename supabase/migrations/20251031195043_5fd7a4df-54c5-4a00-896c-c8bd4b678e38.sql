-- Add fields to store Telegram message info in delivery_notifications
ALTER TABLE delivery_notifications 
ADD COLUMN IF NOT EXISTS telegram_message_id text,
ADD COLUMN IF NOT EXISTS telegram_chat_id text;