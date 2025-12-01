import { GoogleGenAI } from "@google/genai";

export const generateCleanVideo = async (
  imageBase64: string,
  imageMimeType: string,
  promptDescription: string,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> => {
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Chave de API não detectada no ambiente. O aplicativo requer uma API Key configurada internamente.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prompt engineering to guide the model to "clean" the video
  const fullPrompt = `Cinematic, high quality video. ${promptDescription}. 
  Clear visual, no watermarks, no overlay text, clean composition. Photorealistic. Keep the original scene structure but remove overlay elements.`;

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: fullPrompt,
      image: {
        imageBytes: imageBase64,
        mimeType: imageMimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio,
      }
    });

    // Capture the operation name immediately to use for polling
    // This prevents issues where the operation object itself might be handled incorrectly in the loop
    const operationName = operation.name;
    
    if (!operationName) {
        throw new Error("A API não retornou um ID de operação válido.");
    }

    console.log("Iniciando geração de vídeo, operação:", operationName);

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      
      try {
        // Use the explicit operation name for polling to avoid "Requested entity was not found" errors
        // caused by passing the mutating operation object
        operation = await ai.operations.getVideosOperation({ name: operationName });
      } catch (pollError: any) {
        console.warn("Aviso durante polling:", pollError);
        
        // If it's a 404 during polling, it might be a temporary consistency issue or the operation failed silently.
        // We retry a few times implicitly by the loop, but if it persists or is fatal, we throw.
        if (pollError.message && pollError.message.includes('404')) {
             // Optional: could add a retry counter here if needed, but usually 404 on getOperation is fatal 
             // if the name is correct. However, sometimes eventual consistency applies.
             // For now, we allow the loop to continue or fail if it happens repeatedly.
             throw new Error("A operação de vídeo foi perdida pelo servidor (404). Tente novamente.");
        }
        throw pollError;
      }
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!videoUri) {
      // Inspect the error if available in the operation result
      const errorMsg = (operation as any).error?.message || "Nenhum URI de vídeo retornado.";
      throw new Error(`Falha na geração: ${errorMsg}`);
    }

    // Fetch the actual video blob
    const downloadUrl = `${videoUri}&key=${apiKey}`;
    const videoResponse = await fetch(downloadUrl);
    
    if (!videoResponse.ok) {
       throw new Error(`Falha ao baixar vídeo gerado: ${videoResponse.status} ${videoResponse.statusText}`);
    }

    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("Gemini Veo Service Error:", error);
    
    // Provide more specific feedback based on common error codes
    let userMessage = error.message || "Erro desconhecido ao comunicar com a API Gemini.";
    
    if (userMessage.includes('404') && userMessage.includes('entity')) {
        userMessage = "O modelo de vídeo ou a operação não foi encontrada. Verifique se sua conta tem acesso ao modelo Veo.";
    } else if (userMessage.includes('429')) {
        userMessage = "Limite de requisições excedido (Quota). Tente novamente em alguns instantes.";
    }

    throw new Error(userMessage);
  }
};