export const extractFirstFrame = (videoFile: File): Promise<{ base64: string; mimeType: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    // Fail fast if not in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error("O processamento de vídeo requer um ambiente de navegador."));
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    // Timeout de segurança para evitar que o app fique travado eternamente se o evento não disparar
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Tempo limite excedido: Não foi possível extrair o frame do vídeo."));
    }, 15000);

    let url: string = '';

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (url) URL.revokeObjectURL(url);
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      video.remove();
    };

    try {
      url = URL.createObjectURL(videoFile);
      video.src = url;
    } catch (e) {
      cleanup();
      reject(new Error("Falha ao carregar o arquivo de vídeo."));
      return;
    }

    video.onloadeddata = () => {
      // Seek para um ponto seguro. Se o vídeo for muito curto ou stream infinito, ajusta o tempo.
      const duration = Number.isFinite(video.duration) ? video.duration : 10;
      const targetTime = Math.min(0.1, duration > 0 ? duration / 2 : 0);
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const maxDimension = 1024;
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (!width || !height) {
          throw new Error("Dimensões de vídeo inválidas.");
        }

        // Redimensiona se necessário
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
          throw new Error("Não foi possível obter o contexto do canvas.");
        }

        ctx.drawImage(video, 0, 0, width, height);
        
        // Converte para base64 com qualidade otimizada
        const mimeType = 'image/jpeg';
        // toDataURL pode lançar DOMException se o canvas for muito grande ou corrompido
        const dataUrl = canvas.toDataURL(mimeType, 0.85);
        const base64 = dataUrl.split(',')[1];

        cleanup();
        resolve({
          base64,
          mimeType,
          width,
          height
        });
      } catch (error) {
        cleanup();
        console.error("Erro na extração de frame:", error);
        reject(error);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Erro ao decodificar o vídeo. O arquivo pode estar corrompido ou formato não suportado."));
    };
  });
};

export const downloadVideo = (url: string, filename: string) => {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error("Erro ao iniciar download:", e);
  }
};