import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pen, RotateCcw, Check, X } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

// This interface defines the props for the SignatureCapture component.
interface SignatureCaptureProps {
  onComplete: (signatureData: string) => void;
  onCancel: () => void;
  signerName?: string;
  signerEmail?: string;
}

export function SignatureCapture({ 
  onComplete, 
  onCancel, 
  signerName: initialSignerName = '',
  signerEmail: initialSignerEmail = ''
}: SignatureCaptureProps) {
  const [signerName, setSignerName] = useState(initialSignerName);
  const [signerEmail, setSignerEmail] = useState(initialSignerEmail);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const canvasRef = useRef<SignatureCanvas>(null);

  // Function to clear the signature input, for both drawing and typing modes.
  const clearSignature = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
    setTypedSignature('');
  };

  // Function to handle the completion of the signature process.
  const handleComplete = () => {
    let signatureData = '';
    
    if (signatureMode === 'draw') {
      // For drawing mode, get the signature as a base64 PNG image.
      if (canvasRef.current && !canvasRef.current.isEmpty()) {
        signatureData = canvasRef.current.toDataURL('image/png');
      }
    } else {
      // For typing mode, generate an image from the typed text.
      if (typedSignature.trim()) {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.font = '30px cursive'; // Using a cursive font for a signature-like feel.
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
          signatureData = canvas.toDataURL('image/png');
        }
      }
    }

    // If no signature data was generated, do nothing.
    if (!signatureData) {
      return;
    }

    // Pass the generated signature data to the parent component.
    onComplete(signatureData);
  };

  // A derived state to check if a signature has been provided.
  const hasSignature = signatureMode === 'draw' 
    ? canvasRef.current && !canvasRef.current.isEmpty()
    : typedSignature.trim().length > 0;

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Pen className="h-5 w-5 mr-2" />
            Complete Your Signature
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Signer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="signerName">Full Name</Label>
              <Input
                id="signerName"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full name"
                readOnly // Name and email should be read-only for the signer.
              />
            </div>
            <div>
              <Label htmlFor="signerEmail">Email Address</Label>
              <Input
                id="signerEmail"
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="Enter your email"
                readOnly
              />
            </div>
          </div>

          {/* Signature Mode Toggle */}
          <div className="flex space-x-2">
            <Button
              variant={signatureMode === 'draw' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSignatureMode('draw')}
            >
              Draw Signature
            </Button>
            <Button
              variant={signatureMode === 'type' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSignatureMode('type')}
            >
              Type Signature
            </Button>
          </div>

          {/* Signature Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {signatureMode === 'draw' ? 'Draw your signature in the box below' : 'Type your full name'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {signatureMode === 'draw' ? (
                <div className="border border-border rounded-md bg-white">
                  <SignatureCanvas
                    ref={canvasRef}
                    canvasProps={{
                      className: 'signature-canvas w-full h-48 rounded-md',
                    }}
                    penColor="black"
                  />
                </div>
              ) : (
                <Input
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder="Type your full name"
                  className="text-3xl text-center h-24"
                  style={{ fontFamily: 'cursive' }}
                />
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={clearSignature}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleComplete}
                disabled={!hasSignature || !signerName.trim() || !signerEmail.trim()}
              >
                <Check className="h-4 w-4 mr-2" />
                Complete Signature
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
