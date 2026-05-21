-- =============================================
-- ODI.PET — Automatic Birthday Notifications
-- Creates generate_birthday_notifications SQL function
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_birthday_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec         RECORD;
  notif_count INTEGER := 0;
  title_text  TEXT;
  msg_text    TEXT;
BEGIN
  -- Scan pets whose birth_date month and day matches CURRENT_DATE in Turkey (Europe/Istanbul) time zone
  FOR rec IN
    SELECT
      p.id      AS pet_id,
      p.name    AS pet_name,
      p.birth_date,
      po.profile_id,
      -- Calculate the pet's age at this birthday
      EXTRACT(YEAR FROM AGE(
        (CURRENT_DATE AT TIME ZONE 'Europe/Istanbul')::date,
        p.birth_date
      ))::integer AS pet_age
    FROM public.pets p
    JOIN public.pet_owners po ON po.pet_id = p.id
    WHERE p.birth_date IS NOT NULL
      AND to_char(p.birth_date, 'MM-DD') = to_char(CURRENT_DATE AT TIME ZONE 'Europe/Istanbul', 'MM-DD')
      -- Avoid duplicates: check if we already sent a birthday notification today (last 20 hours) for this pet
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.profile_id = po.profile_id
          AND n.pet_id = p.id
          AND n.type = 'general'
          AND n.title LIKE '%Doğum Günü%'
          AND n.created_at > NOW() - INTERVAL '20 hours'
      )
  LOOP
    title_text := rec.pet_name || ' - İyi ki Doğdun! 🎂';
    IF rec.pet_age > 0 THEN
      msg_text   := rec.pet_name || ' bugün ' || rec.pet_age::text || ' yaşına girdi! Ona mutlu, sağlıklı ve neşeli bir ömür dileriz. 🎈🎉';
    ELSE
      msg_text   := rec.pet_name || ' bugün ilk yaşını doldurdu! Ona mutlu ve sağlıklı bir ömür dileriz. 🎈🎉';
    END IF;

    INSERT INTO public.notifications (profile_id, type, title, message, pet_id)
    VALUES (rec.profile_id, 'general', title_text, msg_text, rec.pet_id);

    notif_count := notif_count + 1;
  END LOOP;

  RETURN notif_count;
END;
$$;
