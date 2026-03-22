-- Supabase Schema for PDF Analyzer App

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Prompts Table
CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    size BIGINT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Annotations Table
CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    page INTEGER,
    rects JSONB,
    text TEXT,
    color TEXT,
    type TEXT,
    metadata JSONB
);

-- 5. Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial Admin Users (Optional - you can also register them)
-- INSERT INTO users (name, email, password, role) 
-- VALUES ('Walter Oliveira', 'walterolv@gmail.com', 'HASHED_PASSWORD_HERE', 'admin');

-- Initial Default Prompt
INSERT INTO prompts (name, prompt, is_default)
VALUES ('Análise Padrão', 'Você é um assistente jurídico especializado em análise de documentos. Analise o seguinte documento e forneça um resumo detalhado, identificando as partes envolvidas, datas críticas, obrigações principais e possíveis riscos.', true);

-- Enable Row Level Security (RLS) - Optional but recommended
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
