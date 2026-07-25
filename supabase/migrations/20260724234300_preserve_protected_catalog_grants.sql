-- parasite_products kataloğu yalnızca sunucu tarafındaki yönetim rotalarından
-- yazılır. Genel admin kontrolü yapan RLS politikası bulunsa da istemci rolüne
-- doğrudan yazma tablo ayrıcalığı verilmez.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.parasite_products
FROM anon, authenticated;

GRANT SELECT ON TABLE public.parasite_products TO authenticated;
