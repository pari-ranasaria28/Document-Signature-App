import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PDFViewer } from '@/components/pdf/PDFViewer';
import { SignatureField } from '@/components/pdf/SignatureField';
import { SignatureCapture } from '@/components/pdf/SignatureCapture';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, FileText, Users, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Define the types for the data we'll be fetching
interface Document {
  id: string;
  title: string;
  file_path: string;
  file_name: string;
  status: 'draft' | 'pending' | 'completed' | 'cancelled';
}

interface Signature {
  id: string;
  document_id: string;
  signer_email: string;
  signer_name:string;
  status: 'pending' | 'signed' | 'rejected';
  x_position: number;
  y_position: number;
  page_number: number;
  width: number;
  height: number;
  signature_data: string | null;
}

// This is a default export, making it a page in Next.js
export default function SigningPage() {
  const router = useRouter();
  const { token } = router.query;

  const [document, setDocument] = useState<Document | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [activeSignature, setActiveSignature] = useState<Signature | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isPageRendered, setIsPageRendered] = useState(false);

  const { toast } = useToast();
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!router.isReady || !token) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: shareData, error: shareError } = await supabase
          .from('document_shares')
          .select('document_id, signer_email')
          .eq('token', token as string)
          .single();

        if (shareError || !shareData) throw new Error("Invalid or expired signing link.");

        const { document_id, signer_email } = shareData;
        setCurrentUserEmail(signer_email);

        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', document_id)
          .single();
        
        if (docError || !docData) throw new Error("Could not load the document.");
        setDocument(docData);

        const { data: sigsData, error: sigsError } = await supabase
          .from('signatures')
          .select('*')
          .eq('document_id', document_id);

        if (sigsError) throw new Error("Could not load signature fields.");
        setSignatures(sigsData || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router.isReady, token]);

  useEffect(() => {
    setIsPageRendered(false);
  }, [currentPage, zoom]);

  const handlePageRenderSuccess = () => {
    const container = pdfContainerRef.current;
    if (container) {
      setContainerSize({
        width: container.scrollWidth,
        height: container.scrollHeight,
      });
      setIsPageRendered(true);
    }
  };

  const handleSignatureFieldClick = (signature: Signature) => {
    if (signature.signer_email === currentUserEmail && signature.status === 'pending') {
      setActiveSignature(signature);
    } else if (signature.status !== 'pending') {
      toast({ title: "Signature Locked", description: "This signature has already been completed." });
    } else {
      toast({ title: "Not Your Turn", description: "This signature field is assigned to another user." });
    }
  };

  const handleSignatureComplete = async (signatureData: string) => {
    if (!activeSignature) return;

    try {
      const { error: updateError } = await supabase
        .from('signatures')
        .update({
          signature_data: signatureData,
          status: 'signed',
          signed_at: new Date().toISOString(),
        })
        .eq('id', activeSignature.id);

      if (updateError) throw updateError;

      toast({ title: "Success!", description: "Your signature has been saved." });
      
      const updatedSignatures = signatures.map(sig => 
        sig.id === activeSignature.id 
          ? { ...sig, status: 'signed', signature_data: signatureData } 
          : sig
      );
      setSignatures(updatedSignatures);
      
      setActiveSignature(null);

      await checkAndCompleteDocument(activeSignature.document_id, updatedSignatures);

    } catch (err: any) {
      toast({ title: "Error", description: `Failed to save signature: ${err.message}`, variant: "destructive" });
    }
  };

  const checkAndCompleteDocument = async (documentId: string, currentSignatures: Signature[]) => {
    try {
      const isAllSigned = currentSignatures.every(sig => sig.status === 'signed');

      if (isAllSigned && document?.status === 'pending') {
        await supabase
          .from('documents')
          .update({ status: 'completed' })
          .eq('id', documentId);
        
        setDocument(prevDoc => prevDoc ? { ...prevDoc, status: 'completed' } : null);
        toast({ title: "Document Completed!", description: "All parties have signed the document." });
      }
    } catch (err: any) {
      console.error("Failed to check document completion status:", err);
    }
  };

  const handlePreviewDownload = async () => {
    if (!document) return;
    setIsPreviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('download-signed-document', {
        body: { document_id: document.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        throw new Error("Function did not return a valid URL.");
      }
    } catch (error: any) {
      toast({
        title: "Error creating preview",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  if (isLoading || !router.isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">{document?.title}</h1>
          <p className="text-muted-foreground">Please review and sign the document below.</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-2">
                <div ref={pdfContainerRef} className="relative max-h-[80vh] overflow-auto rounded-md">
                  {document && (
                    <PDFViewer
                      key={document.id}
                      filePath={document.file_path}
                      fileName={document.file_name}
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                      zoom={zoom}
                      onZoomChange={setZoom}
                      onPageRenderSuccess={handlePageRenderSuccess}
                    />
                  )}
                  {isPageRendered && signatures
                    .filter(sig => sig.page_number === currentPage)
                    .map(sig => (
                    <div 
                      key={sig.id} 
                      onClick={() => handleSignatureFieldClick(sig)}
                      className={sig.signer_email === currentUserEmail && sig.status === 'pending' ? 'cursor-pointer ring-2 ring-blue-500 ring-offset-2 rounded-md' : ''}
                    >
                      <SignatureField
                        id={sig.id}
                        x={(sig.x_position || 0) * containerSize.width}
                        y={(sig.y_position || 0) * containerSize.height}
                        width={sig.width}
                        height={sig.height}
                        signerName={sig.signer_name}
                        signerEmail={sig.signer_email}
                        status={sig.status}
                        signatureData={sig.signature_data}
                        isDraggable={false} 
                        isResizable={false}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Document Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-semibold capitalize ${getStatusColor(document?.status || '')}`}>
                    {document?.status}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Users className="h-5 w-5 mr-2" />
                  Signers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {signatures.map(sig => (
                  <div key={sig.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{sig.signer_name}</p>
                      <p className="text-xs text-muted-foreground">{sig.signer_email}</p>
                    </div>
                    <span className={`text-sm font-semibold capitalize ${getStatusColor(sig.status)}`}>
                      {sig.status}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handlePreviewDownload} 
                  className="w-full"
                  disabled={isPreviewing}
                >
                  {isPreviewing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Preview Signed Document
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {activeSignature && (
        <SignatureCapture
          signerName={activeSignature.signer_name}
          signerEmail={activeSignature.signer_email}
          onComplete={handleSignatureComplete}
          onCancel={() => setActiveSignature(null)}
        />
      )}
    </div>
  );
}
