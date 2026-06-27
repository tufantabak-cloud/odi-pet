-- Migration helper
CREATE OR REPLACE FUNCTION public.execute_ddl(ddl text)
RETURNS void AS $$
BEGIN
  EXECUTE ddl;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
