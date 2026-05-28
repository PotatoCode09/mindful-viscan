-- 1. USERS (Synced with Clerk)
create table public.users (
  id text primary key, -- This matches the Clerk User ID (e.g. user_2p...)
  full_name text,
  role text, -- 'student', 'counselor', or 'admin'
  -- Email column removed to match current production DB
  created_at timestamp with time zone default now()
);

-- 2. COUNSELING SESSIONS (The Connection)
create table public.counseling_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id text references public.users(id),
  counselor_id text references public.users(id), -- Nullable (empty until accepted)
  status text, -- 'pending', 'active', 'closed', 'cancelled'
  title text, 
  type text check (type in ('Academic', 'Health', 'Social', 'Personal')),
  scheduled_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 3. MESSAGES (Chat History)
create table public.messages (
  session_id uuid references public.counseling_sessions(id) on delete cascade,
  sender_id text references public.users(id),
  content text,
  created_at timestamp with time zone default now()
);

-- 4. MOOD LOGS (Daily Tracking)
create table public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(id),
  rating int, -- 1 to 5
  summary text,
  note text,
  created_at timestamp with time zone default now()
);

-- 5. THOUGHTS (Journaling)
create table public.thoughts (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(id),
  content text,
  created_at timestamp with time zone default now()
);

-- 6. RESOURCES (Library)
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  type text, -- 'Article', 'Video'
  content_type text, -- Category: 'Academic', 'Health', 'Social', 'Personal'
  content text, -- or URL
  created_at timestamp with time zone default now()
);

-- Enable RLS for Resources (Policies added below)
ALTER TABLE "public"."resources" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- 1. USERS: Allow users to read their own profile
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own profile" ON "public"."users"
AS PERMISSIVE FOR SELECT TO authenticated
USING ( (select auth.jwt() ->> 'sub') = id );

-- 2. MOOD LOGS: Owner only
ALTER TABLE "public"."mood_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner only mood insert" ON "public"."mood_logs"
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK ( (select auth.jwt() ->> 'sub') = user_id );

CREATE POLICY "Owner only mood select" ON "public"."mood_logs"
AS PERMISSIVE FOR SELECT TO authenticated
USING ( (select auth.jwt() ->> 'sub') = user_id );

-- 3. THOUGHTS: Owner only
ALTER TABLE "public"."thoughts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner only thought insert" ON "public"."thoughts"
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK ( (select auth.jwt() ->> 'sub') = user_id );

CREATE POLICY "Owner only thought select" ON "public"."thoughts"
AS PERMISSIVE FOR SELECT TO authenticated
USING ( (select auth.jwt() ->> 'sub') = user_id );

-- 4. COUNSELING SESSIONS: Students and Counselors can see their sessions
ALTER TABLE "public"."counseling_sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner only session select" ON "public"."counseling_sessions"
AS PERMISSIVE FOR SELECT TO authenticated
USING ( 
  (select auth.jwt() ->> 'sub') = student_id 
  OR 
  (select auth.jwt() ->> 'sub') = counselor_id 
);

CREATE POLICY "Students can request sessions"
ON public.counseling_sessions
FOR INSERT
TO authenticated
WITH CHECK ( (select auth.jwt() ->> 'sub') = student_id );

-- 5. COUNSELOR PERMISSIONS
-- Helper function to prevent recursion
CREATE OR REPLACE FUNCTION public.is_counselor()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.users
    WHERE id = (auth.jwt() ->> 'sub') 
    AND role = 'counselor'
  );
END;
$$;

-- Allow counselors to see everything
CREATE POLICY "Counselors can view all sessions"
ON public.counseling_sessions
FOR SELECT
TO authenticated
USING ( is_counselor() );

-- Allow counselors to update sessions (Accept/Reject)
CREATE POLICY "Counselors can update sessions"
ON public.counseling_sessions
FOR UPDATE
TO authenticated
USING ( is_counselor() );

-- Allow students to delete their own sessions
CREATE POLICY "Students can delete own sessions"
ON public.counseling_sessions
FOR DELETE
TO authenticated
USING ( (select auth.jwt() ->> 'sub') = student_id );

-- Allow counselors to view student profiles
CREATE POLICY "Counselors can view student profiles"
ON public.users
FOR SELECT
TO authenticated
USING ( is_counselor() );