create table if not exists marketplace_waitlist (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade not null,
  pet_id uuid references pets(id) on delete cascade not null,

  source text,
  preferred_food_brand text,
  preferred_food_product text,
  urgency_level text,
  notes text,

  created_at timestamp with time zone default now()
);

create unique index if not exists marketplace_waitlist_unique
on marketplace_waitlist(profile_id, pet_id);

-- Enable RLS
alter table marketplace_waitlist enable row level security;

-- Policies
create policy "Users can view their own waitlist entries"
  on marketplace_waitlist for select
  using (auth.uid() = profile_id);

create policy "Users can insert their own waitlist entries"
  on marketplace_waitlist for insert
  with check (auth.uid() = profile_id);
