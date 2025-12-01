export const extractFirstFrame = (videoFile: File): Promise<{ base64: string; mimeType: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadeddata = () => {
      // Seek to a slightly later frame to capture content, not just a black starting frame
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      // Determine new dimensions
      // Reduced to 1024 max dimension to ensure payload fits comfortably within API limits and reduces timeout risks
      const maxDimension = 1024;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);
      
      // Convert to base64 (JPEG with 0.85 quality for good balance)
      const mimeType = 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, 0.85);
      const base64 = dataUrl.split(',')[1];

      URL.revokeObjectURL(url);
      resolve({
        base64,
        mimeType,
        width, // Return the resized dimensions
        height
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Error loading video file"));
    };
  });
};

export const downloadVideo = (url: string, filename: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};