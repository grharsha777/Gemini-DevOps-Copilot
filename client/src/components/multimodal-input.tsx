import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mic,
  MicOff,
  Camera,
  Upload,
  Link,
  Image as ImageIcon,
  Video,
  FileText,
  X,
  Send,
  Sparkles,
  Loader2
} from "lucide-react";

interface MultimodalInputProps {
  onSubmit: (data: {
    text?: string;
    images?: File[];
    audio?: File[];
    video?: File[];
    files?: File[];
    urls?: string[];
  }) => void;
  isLoading?: boolean;
  placeholder?: string;
}

interface MediaPreview {
  id: string;
  file: File;
  type: 'image' | 'audio' | 'video' | 'file';
  preview?: string;
}

export type MediaAttachment = {
  file: File;
  type: string;
  content?: string;
};

export function MultimodalInput({
  onSubmit,
  isLoading = false,
  placeholder = "Describe what you want to build..."
}: MultimodalInputProps) {
  const [text, setText] = useState("");
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = useCallback((files: FileList | null, type: 'image' | 'video' | 'audio' | 'file') => {
    if (!files) return;

    Array.from(files).forEach(file => {
      const id = Date.now() + Math.random().toString(36).substr(2, 9);

      if (type === 'image' && file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        setMediaPreviews(prev => [...prev, { id, file, type: 'image', preview }]);
      } else if (type === 'video' && file.type.startsWith('video/')) {
        const preview = URL.createObjectURL(file);
        setMediaPreviews(prev => [...prev, { id, file, type: 'video', preview }]);
      } else if (type === 'audio' && file.type.startsWith('audio/')) {
        setMediaPreviews(prev => [...prev, { id, file, type: 'audio' }]);
      } else if (type === 'file') {
        setMediaPreviews(prev => [...prev, { id, file, type: 'file' }]);
      }
    });
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.wav`, { type: 'audio/wav' });

        const id = Date.now().toString();
        setMediaPreviews(prev => [...prev, { id, file: audioFile, type: 'audio' }]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const addUrl = () => {
    if (urlInput.trim() && !urls.includes(urlInput.trim())) {
      setUrls(prev => [...prev, urlInput.trim()]);
      setUrlInput("");
    }
  };

  const removeMedia = (id: string) => {
    setMediaPreviews(prev => {
      const item = prev.find(p => p.id === id);
      if (item?.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const removeUrl = (url: string) => {
    setUrls(prev => prev.filter(u => u !== url));
  };

  const handleSubmit = () => {
    if (!text.trim() && mediaPreviews.length === 0 && urls.length === 0) return;

    const data = {
      text: text.trim() || undefined,
      images: mediaPreviews.filter(p => p.type === 'image').map(p => p.file),
      audio: mediaPreviews.filter(p => p.type === 'audio').map(p => p.file),
      video: mediaPreviews.filter(p => p.type === 'video').map(p => p.file),
      files: mediaPreviews.filter(p => p.type === 'file').map(p => p.file),
      urls: urls.length > 0 ? urls : undefined,
    };

    onSubmit(data);

    // Clear form after submission
    setText("");
    mediaPreviews.forEach(p => {
      if (p.preview) URL.revokeObjectURL(p.preview);
    });
    setMediaPreviews([]);
    setUrls([]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5" />
          Multimodal AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Text Input */}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px] resize-none"
        />

        {/* Media Previews */}
        {mediaPreviews.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Attached Media:</h4>
            <ScrollArea className="max-h-32">
              <div className="flex flex-wrap gap-2">
                {mediaPreviews.map((preview) => (
                  <div key={preview.id} className="relative group">
                    <Badge variant="secondary" className="flex items-center gap-2 pr-8">
                      {preview.type === 'image' && <ImageIcon className="w-4 h-4" />}
                      {preview.type === 'video' && <Video className="w-4 h-4" />}
                      {preview.type === 'audio' && <Mic className="w-4 h-4" />}
                      {preview.type === 'file' && <FileText className="w-4 h-4" />}
                      <span className="truncate max-w-24">{preview.file.name}</span>
                      <button
                        onClick={() => removeMedia(preview.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </Badge>
                    {preview.preview && preview.type === 'image' && (
                      <img
                        src={preview.preview}
                        alt={preview.file.name}
                        className="mt-1 w-16 h-16 object-cover rounded border"
                      />
                    )}
                    {preview.preview && preview.type === 'video' && (
                      <video
                        src={preview.preview}
                        className="mt-1 w-16 h-16 object-cover rounded border"
                        muted
                      />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* URLs */}
        {urls.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Linked URLs:</h4>
            <div className="flex flex-wrap gap-2">
              {urls.map((url) => (
                <Badge key={url} variant="outline" className="flex items-center gap-2">
                  <Link className="w-3 h-3" />
                  <span className="truncate max-w-32">{url}</span>
                  <button
                    onClick={() => removeUrl(url)}
                    className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded px-1"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Input Controls */}
        <Tabs defaultValue="media" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>

          <TabsContent value="media" className="space-y-2 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Image
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Video className="w-4 h-4" />
                Video
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => audioInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Audio
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                File
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="voice" className="space-y-2 mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
                className="flex items-center gap-2"
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isRecording ? `Stop (${formatTime(recordingTime)})` : "Record"}
              </Button>
              {isRecording && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Recording...
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="links" className="space-y-2 mt-4">
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter URL (GitHub repo, Figma design, etc.)"
                onKeyDown={(e) => e.key === 'Enter' && addUrl()}
              />
              <Button size="sm" onClick={addUrl} disabled={!urlInput.trim()}>
                Add
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (!text.trim() && mediaPreviews.length === 0 && urls.length === 0)}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isLoading ? "Processing..." : "Generate"}
          </Button>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'image')}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'video')}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'audio')}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'file')}
        />
      </CardContent>
    </Card>
  );
}