-- =============================================
-- HouseNearby - Supabase Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- Listings table
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  property_type text not null check (property_type in ('apartment','house','pg','studio','villa')),
  bhk int not null default 1,
  rent_amount int not null,
  deposit_amount int,
  furnishing text not null default 'unfurnished' check (furnishing in ('unfurnished','semi','furnished')),
  available_from date,
  address text not null,
  city text not null,
  state text not null,
  pincode text,
  lat double precision not null,
  lng double precision not null,
  contact_name text not null,
  contact_phone text not null,
  contact_email text,
  amenities text[] default '{}',
  images text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contact requests (anti-spam log)
create table if not exists contact_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings on delete cascade not null,
  requester_id uuid references auth.users not null,
  requester_email text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index on listings (city);
create index on listings (is_active);
create index on listings (user_id);
create index on listings (rent_amount);
create index on contact_requests (listing_id, requester_id, created_at);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger listings_updated_at
  before update on listings
  for each row execute function update_updated_at();

-- =============================================
-- Row Level Security (RLS)
-- =============================================

alter table listings enable row level security;
alter table contact_requests enable row level security;

-- Listings: anyone can read active listings
create policy "public read active listings"
  on listings for select
  using (is_active = true);

-- Listings: owners can read all their listings (incl. inactive)
create policy "owners read own listings"
  on listings for select
  using (auth.uid() = user_id);

-- Listings: only authenticated users can insert
create policy "authenticated insert listings"
  on listings for insert
  with check (auth.uid() = user_id);

-- Listings: owners can update/delete their own
create policy "owners update listings"
  on listings for update
  using (auth.uid() = user_id);

create policy "owners delete listings"
  on listings for delete
  using (auth.uid() = user_id);

-- Contact requests: authenticated users can insert
create policy "authenticated insert contact_requests"
  on contact_requests for insert
  with check (auth.uid() = requester_id);

-- Contact requests: users can read their own requests, and listing owners can see requests on their listings
create policy "users read own contact_requests"
  on contact_requests for select
  using (
    auth.uid() = requester_id
    or auth.uid() in (select user_id from listings where id = listing_id)
  );

-- =============================================
-- Storage bucket for listing images
-- =============================================

-- Run in Supabase dashboard: Storage > New bucket
-- Name: listing-images
-- Public: true
-- Max file size: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- Storage RLS policies (paste in Storage > Policies)
-- INSERT: authenticated users can upload to their own folder
-- SELECT: public read
-- DELETE: users can delete their own files
