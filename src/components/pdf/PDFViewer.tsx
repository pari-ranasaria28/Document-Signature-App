import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  filePath: string;
  fileName: string;
  onPageChange: (page: number) => void;
  currentPage: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  // FIX: Add a callback for when a page successfully renders.
  onPageRenderSuccess?: () => void;
}

export function PDFViewer({ 
  filePath, 
  fileName, 
  onPageChange, 
  currentPage, 
  zoom,
  onZoomChange,
  onPageRenderSuccess, // FIX: Get the new prop
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let objectUrl: string | null = null;
    const loadPdfFromStorage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: downloadError } = await supabase.storage
          .from('documents')
          .download(filePath);

        if (downloadError) throw downloadError;

        objectUrl = URL.createObjectURL(data);
        setPdfUrl(objectUrl);
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        setError(err.message);
        toast({
          title: "Error",
          description: "Failed to load PDF document.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPdfFromStorage();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [filePath]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('Failed to load PDF. The file may be corrupt or inaccessible.');
  };

  const goToPrevPage = () => {
    onPageChange(Math.max(currentPage - 1, 1));
  };

  const goToNextPage = () => {
    onPageChange(Math.min(currentPage + 1, numPages));
  };

  const handleZoomIn = () => {
    onZoomChange(Math.min(zoom + 0.2, 3));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoom - 0.2, 0.5));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 w-full h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 w-full h-96 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* PDF Controls */}
      <div className="flex items-center justify-between mb-4 p-2 bg-muted rounded-lg sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={currentPage <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            Page {currentPage} of {numPages}
          </span>
          <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage >= numPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 3}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      {pdfUrl && (
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        >
          <Page
            pageNumber={currentPage}
            scale={zoom}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            // FIX: Call the success callback once the page is rendered.
            onRenderSuccess={onPageRenderSuccess}
          />
        </Document>
      )}
    </div>
  );
}
