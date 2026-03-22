-- =====================================================
-- Calendar & Health App Database Schema for Supabase
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES FOR PLANNER APP
-- =====================================================

-- Events table (calendar events)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    category_id UUID,
    memo TEXT,
    repeat TEXT,
    repeat_days TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    emoji TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (user settings)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT,
    groq_api_key TEXT,
    default_rest_time INTEGER DEFAULT 90,
    is_dark_mode BOOLEAN DEFAULT false,
    dynamic_accent TEXT DEFAULT 'orange',
    dynamic_accent_dark TEXT DEFAULT 'orange',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    category TEXT,
    difficulty INTEGER DEFAULT 0,
    last_reviewed TIMESTAMPTZ,
    next_review TIMESTAMPTZ,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    duration INTEGER,
    cards_reviewed INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLES FOR HEALTH APP
-- =====================================================

-- Workout plans (weekly workout plans)
CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout plan days
CREATE TABLE IF NOT EXISTS workout_plan_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL,
    routine_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises in workout plans
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_day_id UUID REFERENCES workout_plan_days(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sets for each exercise
CREATE TABLE IF NOT EXISTS exercise_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
    weight DECIMAL(6,2),
    reps INTEGER,
    completed BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout records (completed workouts)
CREATE TABLE IF NOT EXISTS workout_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date TEXT NOT NULL,
    week_number INTEGER,
    total_volume INTEGER DEFAULT 0,
    duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises in workout records
CREATE TABLE IF NOT EXISTS workout_record_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID REFERENCES workout_records(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sets in workout record exercises
CREATE TABLE IF NOT EXISTS workout_record_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_exercise_id UUID REFERENCES workout_record_exercises(id) ON DELETE CASCADE NOT NULL,
    weight DECIMAL(6,2),
    reps INTEGER,
    completed BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0
);

-- Body records (inbody measurements)
CREATE TABLE IF NOT EXISTS body_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date TEXT NOT NULL,
    weight DECIMAL(5,2),
    muscle_mass DECIMAL(5,2),
    body_fat DECIMAL(4,1),
    body_fat_mass DECIMAL(5,2),
    bmi DECIMAL(4,1),
    visceral_fat INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS events_user_id_idx ON events(user_id);
CREATE INDEX IF NOT EXISTS events_date_idx ON events(date);
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories(user_id);
CREATE INDEX IF NOT EXISTS flashcards_user_id_idx ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS study_sessions_user_id_idx ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS workout_plans_user_id_idx ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS workout_records_user_id_idx ON workout_records(user_id);
CREATE INDEX IF NOT EXISTS workout_records_date_idx ON workout_records(date);
CREATE INDEX IF NOT EXISTS body_records_user_id_idx ON body_records(user_id);
CREATE INDEX IF NOT EXISTS body_records_date_idx ON body_records(date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_record_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_record_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_records ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can access their own events" ON events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access their own notes" ON notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access their own categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access their own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can access their own flashcards" ON flashcards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access their own study sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access their own workout plans" ON workout_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access their own workout records" ON workout_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access their own body records" ON body_records FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workout_plans_updated_at BEFORE UPDATE ON workout_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_body_records_updated_at BEFORE UPDATE ON body_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTION TO CREATE PROFILE ON SIGN UP
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
