import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Send, Loader2 } from "lucide-react";

interface SimpleInputProps {
  onSubmit: (text: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function SimpleInput({
  onSubmit,
  isLoading = false,
  placeholder = "Ask your DevOps AI copilot..."
}: SimpleInputProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.wav`, { type: 'audio/wav' });
        
        // Transcribe audio to text
        const formData = new FormData();
        formData.append('file', audioFile);
        
        try {
          const response = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData
          });
          const data = await response.json();
          if (data.success && data.text) {
            setText(prev => prev ? `${prev} ${data.text}` : data.text);
          }
        } catch (err) {
          console.error('Transcription error:', err);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      let seconds = 0;
      recordingTimerRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
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

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text);
      setText("");
    }
  };

  return (
    <div className="relative">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={placeholder}
            className="min-h-[60px] max-h-[200px] resize-none pr-12"
            disabled={isLoading}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${isRecording ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            {isRecording && (
              <span className="text-xs text-red-500 font-mono">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !text.trim()}
          size="lg"
          className="h-[60px] px-6"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to send, Shift+Enter for new line. Click mic for voice-to-text.
      </p>
    </div>
  );
}

