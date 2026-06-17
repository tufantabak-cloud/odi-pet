create extension if not exists moddatetime schema extensions;

create table public.user_survey_stats (
    user_id uuid references public.profiles(id) on delete cascade primary key,
    ad_fatigue_score integer default 0 not null,
    daily_questions_asked integer default 0 not null,
    consecutive_skips integer default 0 not null,
    last_question_asked_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security)
alter table public.user_survey_stats enable row level security;

create policy "Users can view own survey stats"
    on public.user_survey_stats for select
    using ( auth.uid() = user_id );

create policy "Users can update own survey stats"
    on public.user_survey_stats for update
    using ( auth.uid() = user_id );

create policy "Users can insert own survey stats"
    on public.user_survey_stats for insert
    with check ( auth.uid() = user_id );

-- Trigger for updated_at
create trigger handle_updated_at before update on public.user_survey_stats
    for each row execute procedure extensions.moddatetime (updated_at);
