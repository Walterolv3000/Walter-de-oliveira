/**
 * Utility to handle printing in a way that's compatible with iframes and cross-origin restrictions.
 */

export const safePrintPDF = (url: string) => {
  try {
    // Check if we are in an iframe
    const isIframe = window.self !== window.top;
    
    if (isIframe) {
      // In iframes, direct printing is often blocked by security policies.
      // Opening in a new tab is the most reliable way.
      const printWindow = window.open(url, '_blank');
      if (!printWindow) {
        alert("Por favor, permita popups para imprimir o PDF.");
      }
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      try {
        // Check if we can access the contentWindow
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          
          // Cleanup after a delay to allow print dialog to open
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 60000); // 1 minute is usually enough
        } else {
          throw new Error("Could not access iframe content window");
        }
      } catch (err) {
        console.error("Manual print error:", err);
        // Fallback to opening in a new tab
        window.open(url, '_blank');
        document.body.removeChild(iframe);
      }
    };

    // Handle potential loading errors
    iframe.onerror = () => {
      console.error("Iframe load error for printing");
      window.open(url, '_blank');
      document.body.removeChild(iframe);
    };

  } catch (err) {
    console.error("Print error:", err);
    window.open(url, '_blank');
  }
};

export const safePrintHTML = (elementId: string, title: string = 'Documento') => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert("Por favor, permita popups para imprimir.");
    return;
  }

  // Get all styles from the current document
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(style => style.outerHTML)
    .join('\n');

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        ${styles}
        <style>
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; color: black !important; padding: 20px !important; }
          }
          body { font-family: sans-serif; }
        </style>
      </head>
      <body>
        ${element.innerHTML}
        <script>
          window.onload = () => {
            window.print();
            // Optional: window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
