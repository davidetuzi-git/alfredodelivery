-- Rimuovi il foreign key errato
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_deliverer_id_fkey;

-- Aggiungi il foreign key corretto verso la tabella deliverers
ALTER TABLE public.orders 
ADD CONSTRAINT orders_deliverer_id_fkey 
FOREIGN KEY (deliverer_id) 
REFERENCES public.deliverers(id) 
ON DELETE SET NULL;