import { useState, useRef } from "react";
import { Paperclip, X, Check, Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ScreenshotCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  disabled?: boolean;
}

export function ScreenshotCapture({ onCapture, disabled }: ScreenshotCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const captureScreen = async () => {
    setIsCapturing(true);
    
    try {
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
      
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      fileInputRef.current?.click();
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const confirmCapture = () => {
    if (preview) {
      onCapture(preview);
      setPreview(null);
    }
  };

  const cancelCapture = () => {
    setPreview(null);
  };

  if (preview) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative h-12 w-20 rounded-lg overflow-hidden border-2 border-primary">
          <img src={preview} alt="Preview" className="h-full w-full object-cover" />
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={confirmCapture}
          className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
          data-testid="button-confirm-attachment"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={cancelCapture}
          className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          data-testid="button-cancel-attachment"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
        data-testid="input-file-upload"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled || isCapturing}
            className={cn(
              "shrink-0 transition-all duration-300",
              isCapturing && "animate-pulse"
            )}
            title="Attach image"
            data-testid="button-attachment"
          >
            {isCapturing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={openFileDialog} data-testid="menu-upload-photo">
            <ImagePlus className="h-4 w-4 mr-2" />
            Upload Photo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={captureScreen} data-testid="menu-capture-screen">
            <ImagePlus className="h-4 w-4 mr-2" />
            Capture Screen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
