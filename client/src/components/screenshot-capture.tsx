import { useState, useRef } from "react";
import { Camera, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScreenshotCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  disabled?: boolean;
}

export function ScreenshotCapture({ onCapture, disabled }: ScreenshotCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const captureScreen = async () => {
    setIsCapturing(true);
    setError(null);
    
    try {
      // Try using the Screen Capture API
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as MediaTrackConstraints,
      });
      
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        setPreview(dataUrl);
      }
      
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      // If screen capture fails, fall back to file upload
      setError("Screen capture not available. Please upload an image instead.");
      fileInputRef.current?.click();
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreview(dataUrl);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const confirmCapture = () => {
    if (preview) {
      onCapture(preview);
      setPreview(null);
    }
  };

  const cancelCapture = () => {
    setPreview(null);
    setError(null);
  };

  if (preview) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative h-12 w-20 rounded-lg overflow-hidden border-2 border-primary">
          <img src={preview} alt="Screenshot preview" className="h-full w-full object-cover" />
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={confirmCapture}
          className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
          data-testid="button-confirm-screenshot"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={cancelCapture}
          className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          data-testid="button-cancel-screenshot"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        data-testid="input-file-upload"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={captureScreen}
        disabled={disabled || isCapturing}
        className={cn(
          "shrink-0 transition-all duration-300",
          isCapturing && "animate-pulse"
        )}
        title="Capture screenshot or upload image"
        data-testid="button-capture-screenshot"
      >
        {isCapturing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>
      {error && (
        <span className="text-xs text-muted-foreground">{error}</span>
      )}
    </div>
  );
}
