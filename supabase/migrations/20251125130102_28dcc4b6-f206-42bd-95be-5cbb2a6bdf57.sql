-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text NOT NULL,
  job_title text,
  company text,
  email text NOT NULL,
  phone text,
  website text,
  bio text,
  qr_code_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create connections table
CREATE TABLE public.connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_name text NOT NULL,
  connection_title text,
  connection_email text,
  connection_phone text,
  connection_company text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Create policies for connections
CREATE POLICY "Users can view their own connections"
  ON public.connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
  ON public.connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
  ON public.connections FOR DELETE
  USING (auth.uid() = user_id);

-- Create meetings table
CREATE TABLE public.meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.connections(id) ON DELETE CASCADE,
  meeting_date date NOT NULL,
  meeting_time text NOT NULL,
  follow_up_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Create policies for meetings
CREATE POLICY "Users can view their own meetings"
  ON public.meetings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meetings"
  ON public.meetings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meetings"
  ON public.meetings FOR DELETE
  USING (auth.uid() = user_id);

-- Create meeting_notes table
CREATE TABLE public.meeting_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  text_note text,
  audio_note_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for meeting_notes
CREATE POLICY "Users can view notes for their own meetings"
  ON public.meeting_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_notes.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create notes for their own meetings"
  ON public.meeting_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_notes.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, qr_code_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' || new.id::text
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();