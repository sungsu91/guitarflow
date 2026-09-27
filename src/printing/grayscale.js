// Keep alpha and geometry intact; both score exporters use the same luminance.
export function grayscalePixels(data) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(.2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  return data;
}

export function grayscaleCanvas(canvas) {
  const context = canvas.getContext('2d');
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  grayscalePixels(pixels.data);
  context.putImageData(pixels, 0, 0);
}
