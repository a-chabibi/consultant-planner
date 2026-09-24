
create table profiles (id uuid references auth.users primary key, email text unique not null, role text check (role in ('CONSULTANT','GM')) not null);
create table schedules (id uuid primary key default gen_random_uuid(), consultant_id uuid references profiles(id) not null, client_name text not null, project_name text not null, location text check (location in ('WFO','WFH','On-site','Leave')) not null, task_description text, date date not null, start_time time not null, end_time time not null, status text default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')), rejection_reason text, created_at timestamptz default now());
alter table profiles enable row level security; alter table schedules enable row level security;
create policy "bisa lihat semua" on profiles for select using (true); create policy "bisa insert" on profiles for insert with check (auth.uid()=id);
create policy "bisa lihat jadwal" on schedules for select using (consultant_id=auth.uid() OR exists(select 1 from profiles where id=auth.uid() and role='GM'));
create policy "bisa insert jadwal" on schedules for insert with check (consultant_id=auth.uid()); create policy "bisa update" on schedules for update using (true); create policy "bisa hapus" on schedules for delete using (true);
create or replace function handle_new_user() returns trigger as $$ begin insert into profiles (id, email, role) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'role','CONSULTANT')); return new; end; $$ language plpgsql security definer;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();
