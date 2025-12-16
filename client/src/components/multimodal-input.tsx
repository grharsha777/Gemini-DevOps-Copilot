import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mic, MicOff, Image, File, Video, Code, Camera, 
  X, Upload, FileText, Music, FileCode
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface MediaAttachment {
  id: string;
  type: "image" | "audio" | "video" | "file" | "code";
  file: File;
  preview?: string;
  content?: string; // For code files
}

interface MultiModalInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string, attachments?: MediaAttachment[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiModalInput({
  value,
  onChange,
  onSend,
  placeholder = "Type a message or use voice/image/file input...",
  disabled = false,
}: MultiModalInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  // Voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voice-recording.webm", { type: "audio/webm" });
        
        const attachment: MediaAttachment = {
          id: Date.now().toString(),
          type: "audio",
          file: audioFile,
        };
        
        setAttachments((prev) => [...prev, attachment]);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: "Recording started",
        description: "Click the microphone again to stop recording",
      });
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Recording stopped",
        description: "Voice message added",
      });
    }
  }, [isRecording, toast]);

  // File handling
  const handleFileSelect = useCallback((type: "image" | "video" | "audio" | "file" | "code") => {
    const inputMap = {
      image: imageInputRef,
      video: videoInputRef,
      audio: audioInputRef,
      code: codeInputRef,
      file: fileInputRef,
    };

    inputMap[type].current?.click();
  }, []);

  const handleFileChange = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video" | "audio" | "file" | "code"
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const attachment: MediaAttachment = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        file,
      };

      // Generate preview for images
      if (type === "image") {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments((prev) => {
            const updated = prev.map((att) =>
              att.id === attachment.id ? { ...att, preview: e.target?.result as string } : att
            );
            return updated.length > prev.length ? updated : [...prev, { ...attachment, preview: e.target?.result as string }];
          });
        };
        reader.readAsDataURL(file);
      } else if (type === "code") {
        // Read code file content
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments((prev) => {
            const updated = prev.map((att) =>
              att.id === attachment.id ? { ...att, content: e.target?.result as string } : att
            );
            return updated.length > prev.length ? updated : [...prev, { ...attachment, content: e.target?.result as string }];
          });
        };
        reader.readAsText(file);
      } else {
        setAttachments((prev) => [...prev, attachment]);
      }
    });

    // Reset input
    event.target.value = "";
  }, []);

  // Camera capture
  const handleCameraCapture = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const handleCameraChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const attachment: MediaAttachment = {
      id: Date.now().toString(),
      type: "image",
      file,
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachments((prev) => [...prev, { ...attachment, preview: e.target?.result as string }]);
    };
    reader.readAsDataURL(file);

    event.target.value = "";
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  }, []);

  const handleSend = useCallback(() => {
    if ((!value.trim() && attachments.length === 0) || disabled) return;
    
    onSend(value, attachments.length > 0 ? attachments : undefined);
    setAttachments([]);
    onChange("");
  }, [value, attachments, onSend, onChange, disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="space-y-2">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="relative p-2 max-w-[200px]">
              {attachment.type === "image" && attachment.preview && (
                <img
                  src={attachment.preview}
                  alt="Preview"
                  className="w-full h-24 object-cover rounded"
                />
              )}
              {attachment.type === "audio" && (
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  <span className="text-xs truncate">{attachment.file.name}</span>
                </div>
              )}
              {attachment.type === "video" && (
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  <span className="text-xs truncate">{attachment.file.name}</span>
                </div>
              )}
              {attachment.type === "code" && (
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  <span className="text-xs truncate">{attachment.file.name}</span>
                </div>
              )}
              {attachment.type === "file" && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs truncate">{attachment.file.name}</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={() => removeAttachment(attachment.id)}
              >
                <X className="w-3 h-3" />
              </Button>
              <Badge variant="secondary" className="text-xs mt-1">
                {attachment.type}
              </Badge>
            </Card>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[60px] resize-none pr-24"
            disabled={disabled}
          />
          
          {/* Action Buttons */}
          <div className="absolute right-2 bottom-2 flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleFileSelect("image")}
              title="Upload Image"
            >
              <Image className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCameraCapture}
              title="Camera"
            >
              <Camera className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleFileSelect("file")}
              title="Upload File"
            >
              <File className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleFileSelect("code")}
              title="Code File"
            >
              <Code className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? "Stop Recording" : "Voice Input"}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4 text-red-500 animate-pulse" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        <Button
          onClick={handleSend}
          disabled={disabled || (!value.trim() && attachments.length === 0) || isProcessing}
          size="icon"
          className="h-[60px] w-[60px]"
        >
          <Upload className="w-5 h-5" />
        </Button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, "file")}
        accept="*/*"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, "image")}
        accept="image/*"
      />
      <input
        ref={videoInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, "video")}
        accept="video/*"
      />
      <input
        ref={audioInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, "audio")}
        accept="audio/*"
      />
      <input
        ref={codeInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, "code")}
        accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.cs,.go,.rs,.rb,.php,.swift,.kt,.scala,.sql,.html,.css,.json,.xml,.yaml,.yml,.md,.sh,.bash"
      />
      <input
        ref={cameraInputRef}
        type="file"
        capture="environment"
        className="hidden"
        onChange={handleCameraChange}
        accept="image/*"
      />
    </div>
  );
}

