import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function editPdf(
  existingPdfBytes: ArrayBuffer,
  edits: {
    type: 'text' | 'image' | 'shape' | 'delete' | 'highlight' | 'text-highlight';
    page: number;
    x: number;
    y: number;
    content?: string;
    width?: number;
    height?: number;
    color?: string;
    opacity?: number;
    rects?: { x: number, y: number, w: number, h: number }[];
  }[],
  zoom: number = 1.0
) {
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();

  for (const edit of edits) {
    const page = pages[edit.page - 1];
    if (!page) continue;

    // Use getCropBox to get the visible area of the page
    const cropBox = page.getCropBox();
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = cropBox;
    const rotation = page.getRotation().angle;
    
    const scale = 1 / zoom;

    const transformCoord = (x: number, y: number, w: number, h: number) => {
      const pdfX = x * scale;
      const pdfY = y * scale;
      const pdfW = w * scale;
      const pdfH = h * scale;

      // PDF coordinates are relative to the MediaBox bottom-left.
      // The CropBox defines the visible area.
      // Rotation is counter-clockwise.

      switch (rotation) {
        case 90:
          return {
            x: cropX + pdfY,
            y: cropY + pdfX,
            w: pdfH,
            h: pdfW,
            rotate: 90
          };
        case 180:
          return {
            x: cropX + cropWidth - pdfX - pdfW,
            y: cropY + pdfY,
            w: pdfW,
            h: pdfH,
            rotate: 180
          };
        case 270:
          return {
            x: cropX + cropWidth - pdfY - pdfH,
            y: cropY + cropHeight - pdfX - pdfW,
            w: pdfH,
            h: pdfW,
            rotate: 270
          };
        default: // 0
          return {
            x: cropX + pdfX,
            y: cropY + cropHeight - pdfY - pdfH,
            w: pdfW,
            h: pdfH,
            rotate: 0
          };
      }
    };

    if (edit.type === 'text' && edit.content) {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12 * scale;
      const { x: drawX, y: drawY } = transformCoord(edit.x, edit.y, 0, 0);
      page.drawText(edit.content, {
        x: drawX,
        y: drawY - fontSize, // Adjust for baseline
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    } else if (edit.type === 'shape') {
      const { x: drawX, y: drawY, w: drawW, h: drawH } = transformCoord(edit.x, edit.y, edit.width || 50, edit.height || 50);
      page.drawRectangle({
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(0.8, 0.8, 0.8),
        opacity: 0.3,
      });
    } else if (edit.type === 'highlight') {
      let color = rgb(1, 1, 0);
      if (edit.color) {
        try {
          const hex = edit.color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            color = rgb(r, g, b);
          }
        } catch (e) {}
      }

      const { x: drawX, y: drawY, w: drawW, h: drawH } = transformCoord(edit.x, edit.y, edit.width || 100, edit.height || 20);
      page.drawRectangle({
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
        color,
        opacity: edit.opacity || 0.4,
      });
    } else if (edit.type === 'text-highlight' && edit.rects) {
      let color = rgb(1, 1, 0);
      if (edit.color) {
        try {
          const hex = edit.color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            color = rgb(r, g, b);
          }
        } catch (e) {}
      }

      for (const rect of edit.rects) {
        const { x: drawX, y: drawY, w: drawW, h: drawH } = transformCoord(rect.x, rect.y, rect.w, rect.h);
        page.drawRectangle({
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
          color,
          opacity: edit.opacity || 0.4,
        });
      }
    }
  }

  return await pdfDoc.save();
}

export async function extractPages(pdfBytes: ArrayBuffer, pageIndices: number[]) {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const pdfDoc = await PDFDocument.create();
  
  const copiedPages = await pdfDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((page) => pdfDoc.addPage(page));

  return await pdfDoc.save();
}
