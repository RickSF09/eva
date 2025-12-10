ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS terms_privacy_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_privacy_consent_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS health_data_processing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS health_data_processing_consent_timestamp TIMESTAMPTZ;

