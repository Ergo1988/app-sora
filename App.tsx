import React, { useState, useRef, useEffect } from 'react';
import { Button } from './components/Button';
import { extractFirstFrame, downloadVideo } from './utils/videoUtils';
import { generateCleanVideo } from './services/geminiService';
import { ProcessingState } from './types';
import { ChartBarIcon, ArrowPathIcon, CloudArrowUpIcon, FilmIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [extractedFrame, setExtractedFrame] = useState<{ base64: string; mimeType: string; width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cleanup URLs on unmount
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
    };
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'video/mp4') {
        alert('Por favor, envie apenas arquivos MP4.');
        return;
      }
      
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      setGeneratedVideoUrl(null);
      setProcessingState({ status: 'analyzing', message: 'Analisando vídeo e extraindo frame de referência...' });

      try {
        const frameData = await extractFirstFrame(file);
        setExtractedFrame(frameData);
        setProcessingState({ status: 'idle' });
      } catch (err) {
        console.error(err);
        setProcessingState({ status: 'error', error: 'Falha ao processar o vídeo. Tente outro arquivo.' });
      }
    }
  };

  const handleProcess = async () => {
    if (!extractedFrame) return;
    if (!prompt.trim()) {
      alert("Por favor, descreva brevemente o conteúdo do vídeo para ajudar a IA.");
      return;
    }

    setProcessingState({ status: 'generating', message: 'A IA está reconstruindo o vídeo sem a marca d\'água...' });

    try {
      // Determine aspect ratio based on resolution
      const ratio = extractedFrame.width >= extractedFrame.height ? '16:9' : '9:16';
      
      const url = await generateCleanVideo(
        extractedFrame.base64, 
        extractedFrame.mimeType, 
        prompt, 
        ratio
      );
      
      setGeneratedVideoUrl(url);
      setProcessingState({ status: 'completed' });
    } catch (error: any) {
      setProcessingState({ 
        status: 'error', 
        error: error.message || 'Ocorreu um erro durante a geração do vídeo.' 
      });
    }
  };

  const handleReset = () => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setGeneratedVideoUrl(null);
    setExtractedFrame(null);
    setPrompt("");
    setProcessingState({ status: 'idle' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-primary selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-lg">
              <FilmIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              ClearStream AI
            </h1>
          </div>
          <div className="text-sm text-slate-400 hidden sm:block">
            Powered by Gemini Veo
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Intro */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Remova Marcas d'água de Vídeos <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              usando Inteligência Artificial
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Faça upload do seu vídeo MP4 e deixe nossa IA generativa reconstruir a cena, removendo logos, textos e objetos indesejados automaticamente.
          </p>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Input */}
          <div className="space-y-6">
            <div className="bg-surface rounded-2xl border border-slate-700 p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CloudArrowUpIcon className="h-5 w-5 text-primary" />
                  Upload de Vídeo
                </h3>
                {videoFile && (
                  <button onClick={handleReset} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                    <XMarkIcon className="h-4 w-4" /> Cancelar
                  </button>
                )}
              </div>

              {!videoFile ? (
                <div 
                  className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer bg-slate-800/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="video/mp4" 
                    className="hidden" 
                  />
                  <FilmIcon className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-white font-medium mb-1">Clique para selecionar</p>
                  <p className="text-slate-500 text-sm">Suporta apenas MP4</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-inner">
                    <video 
                      src={videoPreviewUrl!} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                      Original
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                      Descreva o vídeo (Obrigatório)
                    </label>
                    <p className="text-xs text-slate-500">
                      Ajude a IA a entender a cena. Ex: "Um gato correndo na grama", "Um carro esportivo vermelho na estrada".
                    </p>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Descreva o conteúdo do vídeo aqui..."
                      className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none h-24"
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={handleProcess} 
                      className="w-full" 
                      isLoading={processingState.status === 'generating' || processingState.status === 'analyzing'}
                      disabled={processingState.status !== 'idle' || !prompt.trim()}
                    >
                      <SparklesIcon className="h-5 w-5" />
                      {processingState.status === 'generating' ? 'Reconstruindo...' : 'Remover Marca d\'água'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {processingState.status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
                <XMarkIcon className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-400">Erro no Processamento</h4>
                  <p className="text-sm text-red-300/80">{processingState.error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Output */}
          <div className="space-y-6">
            <div className={`bg-surface rounded-2xl border border-slate-700 p-6 shadow-xl h-full min-h-[400px] flex flex-col ${processingState.status === 'generating' ? 'animate-pulse' : ''}`}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ArrowPathIcon className="h-5 w-5 text-secondary" />
                Resultado
              </h3>

              <div className="flex-1 flex flex-col items-center justify-center bg-black/40 rounded-xl border border-slate-700/50 overflow-hidden relative">
                
                {processingState.status === 'idle' && !generatedVideoUrl && (
                  <div className="text-center p-8">
                    <div className="bg-slate-800 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <SparklesIcon className="h-8 w-8 text-slate-600" />
                    </div>
                    <p className="text-slate-500">O vídeo processado aparecerá aqui</p>
                  </div>
                )}

                {processingState.status === 'generating' && (
                  <div className="text-center p-8 w-full max-w-sm">
                     <div className="w-full bg-slate-700 rounded-full h-2 mb-4 overflow-hidden">
                       <div className="bg-gradient-to-r from-primary to-secondary h-full w-2/3 animate-[shimmer_1.5s_infinite_linear]" style={{ backgroundSize: '200% 100%' }}></div>
                     </div>
                     <p className="text-white font-medium animate-pulse">{processingState.message}</p>
                     <p className="text-xs text-slate-500 mt-2">Isso pode levar alguns minutos (geração de vídeo é complexa).</p>
                  </div>
                )}

                {generatedVideoUrl && (
                  <div className="w-full h-full flex flex-col">
                    <video 
                      src={generatedVideoUrl} 
                      controls 
                      autoPlay 
                      loop
                      className="w-full flex-1 object-contain max-h-[500px]"
                    />
                    <div className="p-4 bg-surface border-t border-slate-700 flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={() => downloadVideo(generatedVideoUrl!, 'video_sem_marca_dagua.mp4')} 
                        className="flex-1"
                      >
                        Baixar MP4 Limpo
                      </Button>
                      <Button variant="secondary" onClick={handleReset}>
                        Processar Outro
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
              <p className="text-xs text-blue-300">
                <strong>Nota:</strong> Esta ferramenta utiliza o modelo <em>Veo</em> da Google para reconstruir o vídeo. O resultado é uma recriação baseada na cena original sem a obstrução, podendo haver pequenas variações nos detalhes em relação ao original.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;