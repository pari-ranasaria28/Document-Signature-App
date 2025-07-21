import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Pen } from 'lucide-react';

// This interface defines the props for the SignatureField component.
interface SignatureFieldProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  signerName: string;
  signerEmail: string;
  status: 'pending' | 'signed' | 'rejected';
  signatureData?: string | null;
  onMove?: (id:string, x: number, y: number) => void;
  onResize?: (id: string, width: number, height: number) => void;
  onDelete?: (id: string) => void;
  isDraggable?: boolean;
  isResizable?: boolean;
}

export function SignatureField({
  id,
  x,
  y,
  width,
  height,
  signerName,
  signerEmail,
  status,
  signatureData,
  onMove,
  onResize,
  onDelete,
  isDraggable = true,
  isResizable = true,
}: SignatureFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const fieldRef = useRef<HTMLDivElement>(null);

  // This function handles the start of a drag operation.
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent dragging if the field is not draggable or already signed.
    if (!isDraggable || status === 'signed') return;
    
    const rect = fieldRef.current?.getBoundingClientRect();
    if (rect) {
      // Calculate the offset of the mouse click within the signature field.
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  // This function handles the mouse movement during a drag operation.
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !onMove) return;
    
    const container = fieldRef.current?.parentElement;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      // Calculate the new X and Y position in pixels relative to the parent container.
      const newX = e.clientX - containerRect.left - dragOffset.x;
      const newY = e.clientY - containerRect.top - dragOffset.y;
      
      // Pass the new pixel coordinates up to the parent component (DocumentViewer).
      onMove(id, Math.max(0, newX), Math.max(0, newY));
    }
  };

  // This function handles the end of a drag operation.
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // This effect adds and removes global event listeners for dragging.
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // This function determines the border and background color based on status.
  const getStatusColor = () => {
    switch (status) {
      case 'signed':
        // For a signed field, make the border transparent to show only the image.
        return 'border-green-500 bg-green-500/10'; 
      case 'rejected':
        return 'border-red-500 bg-red-500/10';
      default:
        return 'border-yellow-500 bg-yellow-500/10';
    }
  };

  return (
    <div
      ref={fieldRef}
      className={`absolute border-2 ${status === 'pending' ? 'border-dashed' : 'border-solid'} ${getStatusColor()} rounded-md ${isDraggable && status === 'pending' ? 'cursor-move' : ''} select-none transition-all duration-200 hover:shadow-lg`}
      style={{
        left: x,
        top: y,
        width,
        height,
        minWidth: 100,
        minHeight: 40,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="relative w-full h-full">
        {/* Show delete button only for pending signatures. */}
        {onDelete && status === 'pending' && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-3 -right-3 h-6 w-6 p-0 z-10 rounded-full"
            onClick={(e) => {
              e.stopPropagation(); // Prevent the drag event from firing
              onDelete(id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        {/* Conditionally render the signature image or the placeholder text. */}
        {status === 'signed' && signatureData ? (
          <img 
            src={signatureData} 
            alt={`${signerName}'s signature`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center h-full p-2">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1 text-gray-600">
                <Pen className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">Sign Here</span>
              </div>
              <div className="text-xs text-muted-foreground font-semibold">
                {signerName}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {signerEmail}
              </div>
            </div>
          </div>
        )}

        {/* Show resize handle only for pending signatures. */}
        {isResizable && status === 'pending' && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary cursor-se-resize" />
        )}
      </div>
    </div>
  );
}
