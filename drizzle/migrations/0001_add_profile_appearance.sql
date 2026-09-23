ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'preto',
  ADD COLUMN IF NOT EXISTS accent text NOT NULL DEFAULT 'roxo';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_theme_check CHECK (theme IN ('branco', 'cinza', 'preto'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_accent_check CHECK (accent IN ('rosa', 'roxo', 'verde', 'vermelho', 'azul', 'laranja'));

COMMENT ON COLUMN public.profiles.theme IS 'Preferencia de tema visual do proprio usuario.';
COMMENT ON COLUMN public.profiles.accent IS 'Cor secundaria escolhida pelo proprio usuario.';