-- RPC for safely incrementing vet load
CREATE OR REPLACE FUNCTION public.increment_vet_load(p_vet_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.vet_status
  SET current_load = current_load + 1
  WHERE vet_id = p_vet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for safely decrementing vet load
CREATE OR REPLACE FUNCTION public.decrement_vet_load(p_vet_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.vet_status
  SET current_load = GREATEST(0, current_load - 1)
  WHERE vet_id = p_vet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
