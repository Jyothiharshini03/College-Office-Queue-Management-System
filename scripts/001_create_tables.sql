-- Create profiles table for student data
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  roll_number text unique not null,
  role text default 'student',
  created_at timestamp with time zone default now() not null
);

-- Create services table
create table if not exists public.services (
  id text primary key,
  name text not null,
  prefix text not null,
  description text,
  icon text,
  created_at timestamp with time zone default now() not null
);

-- Create tokens table
create table if not exists public.tokens (
  id uuid primary key default gen_random_uuid(),
  token_number text not null,
  user_id uuid references auth.users(id) on delete cascade,
  user_name text not null,
  user_roll_number text not null,
  service_id text references public.services(id) on delete cascade,
  service_name text not null,
  status text default 'waiting',
  created_at timestamp with time zone default now() not null,
  called_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- Create token_counters table
create table if not exists public.token_counters (
  id uuid primary key default gen_random_uuid(),
  service_id text references public.services(id) on delete cascade,
  counter_date date default current_date,
  counter integer default 0,
  unique(service_id, counter_date)
);

-- Insert default services
insert into public.services (id, name, prefix, description, icon) values
  ('fee-payment', 'Fee Payment', 'F', 'Pay tuition and other fees', 'CreditCard'),
  ('bonafide', 'Bonafide Certificate', 'B', 'Get bonafide certificate', 'FileText'),
  ('transfer', 'Transfer Certificate', 'T', 'Apply for TC', 'FileOutput'),
  ('scholarship', 'Scholarship Verification', 'S', 'Verify scholarship status', 'GraduationCap'),
  ('id-card', 'ID Card Issue', 'I', 'Get new ID card', 'IdCard'),
  ('bus-pass', 'Bus Pass', 'P', 'Apply for bus pass', 'Bus')
on conflict (id) do nothing;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.tokens enable row level security;
alter table public.token_counters enable row level security;

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Service role can insert profiles" on public.profiles;
drop policy if exists "Anyone can view services" on public.services;
drop policy if exists "Users can view their own tokens" on public.tokens;
drop policy if exists "Users can create their own tokens" on public.tokens;
drop policy if exists "Admins can view all tokens" on public.tokens;
drop policy if exists "Admins can update all tokens" on public.tokens;
drop policy if exists "Anyone can view token counters" on public.token_counters;
drop policy if exists "Admins can update token counters" on public.token_counters;

-- RLS policies for profiles
create policy "Users can view their own profile" on public.profiles 
  for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles 
  for update using (auth.uid() = id);
create policy "Service role can insert profiles" on public.profiles 
  for insert with check (true);

-- RLS policies for services (everyone can read)
create policy "Anyone can view services" on public.services 
  for select using (true);

-- RLS policies for tokens
create policy "Users can view their own tokens" on public.tokens 
  for select using (auth.uid() = user_id);
create policy "Users can create their own tokens" on public.tokens 
  for insert with check (auth.uid() = user_id);
create policy "Admins can view all tokens" on public.tokens 
  for select using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );
create policy "Admins can update all tokens" on public.tokens 
  for update using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS policies for token_counters (admins only for write, anyone can read)
create policy "Anyone can view token counters" on public.token_counters 
  for select using (true);
create policy "Admins can update token counters" on public.token_counters 
  for all using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );
