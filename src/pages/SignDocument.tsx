import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PDFViewer } from '@/components/pdf/PDFViewer';
import { SignatureCapture } from '@/components/pdf/SignatureCapture';

interface DocumentShare {
  id: string;
  document_id: string;
  signer_email: string;
  expires_at: string;
  used_at: string | null;
  document: {
    title: string;
    file_path: string;
    file_name: string;
  };
}

interface Signature {
  id: string;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  page_number: number;
  signer_name: string | null;
  signer_email: string;
  status: 'pending' | 'signed' | 'rejected';
}

export default function SignDocument() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [documentShare, setDocumentShare] = useState<DocumentShare | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [currentSignatureId, setCurrentSignatureId] = useState<string | null>(null);
  const [signingMode, setSigningMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadDocumentShare();
    }
  }, [token]);

  const loadDocumentShare = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get document share by token
      const { data: shareData, error: shareError } = await supabase
        .from('document_shares')
        .select(`
          *,
          document:documents(title, file_path, file_name)
        `)
        .eq('token', token)
        .single();

      if (shareError) throw shareError;
      if (!shareData) throw new Error('Document not found');

      // Check if expired
      if (new Date(shareData.expires_at) < new Date()) {
        throw new Error('This signing link has expired');
      }

      // Check if already used
      if (shareData.used_at) {
        throw new Error('This signing link has already been used');
      }

      setDocumentShare(shareData);

      // Load signatures for this signer
      const { data: sigData, error: sigError } = await supabase
        .from('signatures')
        .select('*')
        .eq('document_id', shareData.document_id)
        .eq('signer_email', shareData.signer_email);

      if (sigError) throw sigError;
      setSignatures((sigData || []).map(sig => ({
        ...sig,
        status: sig.status as 'pending' | 'signed' | 'rejected'
      })));

    } catch (err: any) {
      console.error('Error loading document share:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureStart = (signatureId: string) => {
    setCurrentSignatureId(signatureId);
    setSigningMode(true);
  };

  const handleSignatureComplete = async (signatureData: string) => {
    if (!currentSignatureId || !documentShare) return;

    try {
      // Update signature with signature data
      const { error } = await supabase
        .from('signatures')
        .update({
          signature_data: signatureData,
          status: 'signed',
          signed_at: new Date().toISOString(),
        })
        .eq('id', currentSignatureId);

      if (error) throw error;

      // Update local state
      setSignatures(prev => prev.map(sig => 
        sig.id === currentSignatureId 
          ? { ...sig, status: 'signed' as const, signature_data: signatureData }
          : sig
      ));

      // Check if all signatures are complete
      const updatedSignatures = signatures.map(sig => 
        sig.id === currentSignatureId ? { ...sig, status: 'signed' as const } : sig
      );
      
      const allSigned = updatedSignatures.every(sig => sig.status === 'signed');
      
      if (allSigned) {
        // Mark share as used
        await supabase
          .from('document_shares')
          .update({ used_at: new Date().toISOString() })
          .eq('id', documentShare.id);

        // Create audit log
        await supabase
          .from('audit_logs')
          .insert({
            document_id: documentShare.document_id,
            signer_email: documentShare.signer_email,
            action: 'document_signed',
            details: { signatures_count: updatedSignatures.length }
          });

        toast({
          title: "Document Signed",
          description: "All signatures have been completed successfully.",
        });
      }

      setSigningMode(false);
      setCurrentSignatureId(null);

    } catch (err: any) {
      console.error('Error saving signature:', err);
      toast({
        title: "Error",
        description: "Failed to save signature. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRejectDocument = async () => {
    if (!documentShare) return;

    try {
      // Update all signatures to rejected
      const { error } = await supabase
        .from('signatures')
        .update({
          status: 'rejected',
          rejection_reason: 'Document rejected by signer',
        })
        .eq('document_id', documentShare.document_id)
        .eq('signer_email', documentShare.signer_email);

      if (error) throw error;

      // Mark share as used
      await supabase
        .from('document_shares')
        .update({ used_at: new Date().toISOString() })
        .eq('id', documentShare.id);

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          document_id: documentShare.document_id,
          signer_email: documentShare.signer_email,
          action: 'document_rejected',
          details: { reason: 'Document rejected by signer' }
        });

      toast({
        title: "Document Rejected",
        description: "The document has been rejected.",
      });

      navigate('/');

    } catch (err: any) {
      console.error('Error rejecting document:', err);
      toast({
        title: "Error",
        description: "Failed to reject document. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading document...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => navigate('/')} variant="outline">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!documentShare) return null;

  const allSigned = signatures.every(sig => sig.status === 'signed');
  const hasRejected = signatures.some(sig => sig.status === 'rejected');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Sign Document: {documentShare.document.title}
            </CardTitle>
            <p className="text-muted-foreground">
              Please review and sign the document below
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Status Alert */}
            {allSigned && (
              <Alert className="border-accent">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All signatures have been completed successfully!
                </AlertDescription>
              </Alert>
            )}

            {hasRejected && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  This document has been rejected.
                </AlertDescription>
              </Alert>
            )}

            {/* PDF Viewer */}
            <div className="space-y-4">
              <PDFViewer
                filePath={documentShare.document.file_path}
                fileName={documentShare.document.file_name}
              />
            </div>

            {/* Signature Fields */}
            {signatures.length > 0 && !allSigned && !hasRejected && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Required Signatures</h3>
                <div className="grid gap-4">
                  {signatures.map((signature) => (
                    <Card key={signature.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {signature.signer_name || signature.signer_email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Status: {signature.status}
                          </p>
                        </div>
                        {signature.status === 'pending' && (
                          <Button onClick={() => handleSignatureStart(signature.id)}>
                            Sign Here
                          </Button>
                        )}
                        {signature.status === 'signed' && (
                          <CheckCircle className="h-5 w-5 text-accent" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!allSigned && !hasRejected && (
              <div className="flex justify-between pt-6">
                <Button
                  variant="destructive"
                  onClick={handleRejectDocument}
                >
                  Reject Document
                </Button>
                <div className="text-sm text-muted-foreground">
                  {signatures.filter(s => s.status === 'signed').length} of {signatures.length} signatures completed
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signature Capture Modal */}
        {signingMode && currentSignatureId && (
          <SignatureCapture
            onComplete={handleSignatureComplete}
            onCancel={() => {
              setSigningMode(false);
              setCurrentSignatureId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}