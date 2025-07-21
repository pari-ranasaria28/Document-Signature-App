import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { document_id } = await req.json();
    if (!document_id) {
      throw new Error('Document ID is required.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch original document to get the file name
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('file_path, file_name') // Also get file_name
      .eq('id', document_id)
      .single();
    if (docError) throw docError;

    const { data: pdfFileData, error: fileError } = await supabaseAdmin.storage
      .from('documents')
      .download(document.file_path);
    if (fileError) throw fileError;

    const { data: signatures, error: sigError } = await supabaseAdmin
      .from('signatures')
      .select('signature_data, x_position, y_position, width, height, page_number')
      .eq('document_id', document_id)
      .eq('status', 'signed');
    if (sigError) throw sigError;

    const pdfDoc = await PDFDocument.load(await pdfFileData.arrayBuffer());
    const pages = pdfDoc.getPages();

    for (const sig of signatures) {
      if (sig.signature_data) {
        const page = pages[sig.page_number - 1];
        if (!page) continue;
        
        const pngImage = await pdfDoc.embedPng(sig.signature_data);

        // FIX: Convert percentage-based coordinates to absolute PDF points
        const absoluteX = sig.x_position * page.getWidth();
        const absoluteY = sig.y_position * page.getHeight();

        page.drawImage(pngImage, {
          // Use the calculated absolute positions
          x: absoluteX,
          // Convert from top-based percentage to bottom-based absolute points
          y: page.getHeight() - absoluteY - sig.height, 
          width: sig.width,
          height: sig.height,
        });
      }
    }
    
    const pdfBytes = await pdfDoc.save();

    // **NEW LOGIC: Upload to storage instead of returning the file**
    const signedFileName = `${document.file_name.replace('.pdf', '')}_signed_${Date.now()}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('signed-documents')
      .upload(signedFileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get the public URL of the newly uploaded file
    const { data: urlData } = supabaseAdmin.storage
      .from('signed-documents')
      .getPublicUrl(signedFileName);

    // **Return the URL as JSON**
    return new Response(JSON.stringify({ signedUrl: urlData.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('An error occurred in the function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
