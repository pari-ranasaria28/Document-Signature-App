-- Create document signature app database schema

-- Documents table for storing PDF metadata
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Signatures table for tracking signature fields and their positions
CREATE TABLE public.signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_email TEXT NOT NULL,
  signer_name TEXT,
  x_position REAL NOT NULL,
  y_position REAL NOT NULL,
  page_number INTEGER NOT NULL DEFAULT 1,
  width REAL NOT NULL DEFAULT 150,
  height REAL NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'rejected')),
  signature_data TEXT, -- Base64 signature image or text
  signed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sharing links table for secure document sharing
CREATE TABLE public.document_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  signer_email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit logs table for tracking document activities
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID,
  signer_email TEXT,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for signatures
CREATE POLICY "Users can view signatures for their documents"
  ON public.signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create signatures for their documents"
  ON public.signatures FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update signatures for their documents"
  ON public.signatures FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_id AND d.user_id = auth.uid()
    )
  );

-- RLS Policies for document shares
CREATE POLICY "Users can view shares for their documents"
  ON public.document_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shares for their documents"
  ON public.document_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_id AND d.user_id = auth.uid()
    )
  );

-- RLS Policies for audit logs
CREATE POLICY "Users can view audit logs for their documents"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create audit logs for their documents"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_id AND d.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_signatures_document_id ON public.signatures(document_id);
CREATE INDEX idx_signatures_status ON public.signatures(status);
CREATE INDEX idx_document_shares_token ON public.document_shares(token);
CREATE INDEX idx_document_shares_document_id ON public.document_shares(document_id);
CREATE INDEX idx_audit_logs_document_id ON public.audit_logs(document_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_signatures_updated_at
  BEFORE UPDATE ON public.signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage policies for documents
CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);