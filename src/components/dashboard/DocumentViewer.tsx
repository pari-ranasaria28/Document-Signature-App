import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Share, Plus, Eye, Download, Send, Loader2 } from "lucide-react";
import { PDFViewer } from "@/components/pdf/PDFViewer";
import { SignatureField } from "@/components/pdf/SignatureField";

interface Document {
  id: string;
  title: string;
  description: string;
  file_name: string;
  file_path: string;
  status: 'draft' | 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

interface Signature {
  id: string;
  signer_email: string;
  signer_name: string;
  status: 'pending' | 'signed' | 'rejected';
  x_position: number;
  y_position: number;
  page_number: number;
  width: number;
  height: number;
  signed_at: string | null;
  signature_data: string | null; 
}

interface DocumentViewerProps {
  document: Document;
  onBack: () => void;
  onUpdate: () => void;
}

export function DocumentViewer({ document, onBack, onUpdate }: DocumentViewerProps) {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddSigner, setShowAddSigner] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  // FIX: This state will hold the measured dimensions of the PDF container.
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSignatures();
  }, [document.id]);

  // FIX: This effect uses a ResizeObserver to reliably measure the PDF container's
  // full scrollable dimensions, ensuring correct signature positioning.
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (container) {
      const observer = new ResizeObserver(() => {
        setContainerSize({
          width: container.scrollWidth,
          height: container.scrollHeight,
        });
      });
      observer.observe(container);
      // Initial measurement
      setContainerSize({
        width: container.scrollWidth,
        height: container.scrollHeight,
      });
      return () => observer.disconnect();
    }
  }, [signatures]); // Re-measure if the number of signatures changes


  const fetchSignatures = async () => {
    try {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('document_id', document.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSignatures(data as Signature[] || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch signatures",
        variant: "destructive",
      });
    }
  };

  const handleAddSigner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const signerEmail = formData.get("signerEmail") as string;
    const signerName = formData.get("signerName") as string;

    try {
      const { error } = await supabase
        .from('signatures')
        .insert({
          document_id: document.id,
          signer_email: signerEmail,
          signer_name: signerName,
          x_position: 0.1,
          y_position: 0.1,
          page_number: currentPage,
          width: 150,
          height: 50,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Signer added successfully",
      });

      setShowAddSigner(false);
      fetchSignatures();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSignature = async (signatureId: string, x: number, y: number) => {
    const container = pdfContainerRef.current;
    if (!container) return;

    const contentWidth = container.scrollWidth;
    const contentHeight = container.scrollHeight;

    const absoluteX = x + container.scrollLeft;
    const absoluteY = y + container.scrollTop;

    const normalizedX = absoluteX / contentWidth;
    const normalizedY = absoluteY / contentHeight;

    try {
      const { error } = await supabase
        .from('signatures')
        .update({ x_position: normalizedX, y_position: normalizedY })
        .eq('id', signatureId);

      if (error) throw error;

      setSignatures(prev => 
        prev.map(sig => 
          sig.id === signatureId 
            ? { ...sig, x_position: normalizedX, y_position: normalizedY }
            : sig
        )
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update signature position",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSignature = async (signatureId: string) => {
    try {
      const { error } = await supabase
        .from('signatures')
        .delete()
        .eq('id', signatureId);

      if (error) throw error;

      setSignatures(prev => prev.filter(sig => sig.id !== signatureId));
      toast({
        title: "Success",
        description: "Signature field removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove signature field",
        variant: "destructive",
      });
    }
  };

  const generateSigningLink = async (signature: Signature) => {
    setLoading(true);
    try {
      if (document.status === 'draft') {
        const { error: updateError } = await supabase
          .from('documents')
          .update({ status: 'pending' })
          .eq('id', document.id);

        if (updateError) throw updateError;
        
        onUpdate(); 
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error: shareError } = await supabase
        .from('document_shares')
        .insert({
          document_id: document.id,
          signer_email: signature.signer_email,
          token: token,
          expires_at: expiresAt.toISOString(),
        });

      if (shareError) throw shareError;

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          document_id: document.id,
          action: 'signing_link_generated',
          signer_email: signature.signer_email,
          details: { signature_id: signature.id }
        });
      
      if (auditError) throw auditError;

      const signingUrl = `${window.location.origin}/sign/${token}`;
      await navigator.clipboard.writeText(signingUrl);
      
      toast({
        title: "Success",
        description: "Signing link copied to clipboard.",
      });

    } catch (err: any)      {
      console.error('Error generating signing link:', err);
      toast({
        title: "Error",
        description: `Failed to generate signing link: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (signatures.length === 0) {
      toast({
        title: "Cannot Share",
        description: "Please add at least one signer to the document first.",
        variant: "destructive",
      });
      return;
    }
    const firstSignature = signatures[0];
    generateSigningLink(firstSignature);
  };

  const downloadDocument = async () => {
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('download-signed-document', {
        body: { document_id: document.id },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        throw new Error("Function did not return a valid URL.");
      }

    } catch (error: any) {
      toast({
        title: "Error creating download link",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'text-green-500';
      case 'pending':
        return 'text-yellow-500';
      case 'rejected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button onClick={onBack} variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{document.title}</h1>
              <p className="text-muted-foreground">{document.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={downloadDocument} variant="outline" disabled={isDownloading}>
                {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Download
              </Button>
              <Button onClick={handleShare} variant="outline">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button onClick={() => setShowAddSigner(true)} variant="hero">
                <Plus className="h-4 w-4 mr-2" />
                Add Signer
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Document Preview
                </CardTitle>
                <CardDescription>
                  PDF viewer with signature field placement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  ref={pdfContainerRef} 
                  className="relative max-h-[80vh] overflow-auto"
                >
                  <PDFViewer
                    filePath={document.file_path}
                    fileName={document.file_name}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    zoom={zoom}
                    onZoomChange={setZoom}
                  />
                  
                  {containerSize.width > 0 && signatures
                    .filter(sig => sig.page_number === currentPage)
                    .map(signature => (
                      <SignatureField
                        key={signature.id}
                        id={signature.id}
                        x={(signature.x_position || 0) * containerSize.width}
                        y={(signature.y_position || 0) * containerSize.height}
                        width={signature.width}
                        height={signature.height}
                        signerName={signature.signer_name}
                        signerEmail={signature.signer_email}
                        status={signature.status}
                        signatureData={signature.signature_data}
                        onMove={handleMoveSignature}
                        onDelete={handleDeleteSignature}
                      />
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Signatures ({signatures.length})</CardTitle>
                <CardDescription>
                  Manage document signers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {signatures.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No signers added yet</p>
                    <Button onClick={() => setShowAddSigner(true)} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Signer
                    </Button>
                  </div>
                ) : (
                  signatures.map((signature) => (
                    <div key={signature.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{signature.signer_name}</p>
                        <span className={`text-xs font-medium capitalize ${getStatusColor(signature.status)}`}>
                          {signature.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{signature.signer_email}</p>
                      <p className="text-xs text-muted-foreground">
                        Page {signature.page_number}
                      </p>
                      {signature.signed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Signed: {new Date(signature.signed_at).toLocaleDateString()}
                        </p>
                      )}
                      {signature.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full"
                          onClick={() => generateSigningLink(signature)}
                          disabled={loading}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Generate Link
                        </Button>
                      )}
                    </div>
                  ))
                )}

                {showAddSigner && (
                  <Card className="mt-4">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Add Signer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddSigner} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signerName">Name</Label>
                          <Input
                            id="signerName"
                            name="signerName"
                            placeholder="Signer's full name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signerEmail">Email</Label>
                          <Input
                            id="signerEmail"
                            name="signerEmail"
                            type="email"
                            placeholder="signer@example.com"
                            required
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button type="submit" size="sm" disabled={loading}>
                            {loading ? "Adding..." : "Add Signer"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddSigner(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Document Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-muted-foreground capitalize">{document.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(document.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">File Name</p>
                  <p className="text-sm text-muted-foreground">{document.file_name}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
