/**
 * Shrink a camera photo to a JPEG the API handles well. Phone photos are 12+ MP;
 * past ~1568 px on the long edge the model gains nothing and uploads get slow.
 * Drawing through a canvas also converts HEIC (Safari decodes it) to JPEG.
 */
export async function photoToJpeg(file: File, maxEdge = 1568, quality = 0.85): Promise<{ base64: string; dataUrl: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This photo format couldn’t be read. Try taking the picture again.'));
      el.src = url;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Couldn’t process the photo on this device.');
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(',') + 1) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
