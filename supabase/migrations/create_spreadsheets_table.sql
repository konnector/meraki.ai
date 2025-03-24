create table public.spreadsheets (
  id uuid not null default gen_random_uuid(),
  user_id text not null,
  title text not null default 'Untitled Spreadsheet',
  cells jsonb not null default '{}',
  is_starred boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  last_interaction_at timestamp with time zone not null default now(),
  
  constraint spreadsheets_pkey primary key (id)
);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamps
CREATE TRIGGER update_timestamps
    BEFORE UPDATE ON public.spreadsheets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.spreadsheets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON public.spreadsheets FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON public.spreadsheets FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Enable update for users based on user_id"
  ON public.spreadsheets FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Enable delete for users based on user_id"
  ON public.spreadsheets FOR DELETE
  USING (auth.uid()::text = user_id);

-- Create indexes for better performance
CREATE INDEX idx_spreadsheets_user_id ON public.spreadsheets(user_id);
CREATE INDEX idx_spreadsheets_updated_at ON public.spreadsheets(updated_at DESC);
CREATE INDEX idx_spreadsheets_last_interaction_at ON public.spreadsheets(last_interaction_at DESC);
CREATE INDEX idx_spreadsheets_is_starred ON public.spreadsheets(is_starred) WHERE is_starred = true; 