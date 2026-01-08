import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Image, Video, FileText, Upload, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface MediaPickerProps {
  onUpload: (url: string, type: string) => void;
  onClose: () => void;
}

export const MediaPicker = ({ onUpload, onClose }: MediaPickerProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);

    // Create preview for images/videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to upload files');
        return;
      }

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // For now, we'll create a blob URL (in production, upload to storage)
      const blobUrl = URL.createObjectURL(selectedFile);

      let mediaType = 'file';
      if (selectedFile.type.startsWith('image/')) {
        mediaType = 'image';
      } else if (selectedFile.type.startsWith('video/')) {
        mediaType = 'video';
      }

      onUpload(blobUrl, mediaType);
      toast.success('File uploaded successfully');
      onClose();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const mediaTypes = [
    { icon: Image, label: 'Image', accept: 'image/*' },
    { icon: Video, label: 'Video', accept: 'video/*' },
    { icon: FileText, label: 'Document', accept: '.pdf,.doc,.docx,.txt' },
  ];

  return (
    <div className="p-3 sm:p-4 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Upload Media</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!selectedFile ? (
        <>
          {/* Media Type Selection */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {mediaTypes.map(({ icon: Icon, label, accept }) => (
              <motion.button
                key={label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = accept;
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center gap-1 sm:gap-2 p-3 sm:p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                <span className="text-sm">{label}</span>
              </motion.button>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />

          <p className="text-xs text-center text-muted-foreground">
            Max file size: 10MB
          </p>
        </>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          {preview && (
            <div className="relative rounded-lg overflow-hidden bg-muted">
              {selectedFile.type.startsWith('image/') ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-[200px] object-contain"
                />
              ) : selectedFile.type.startsWith('video/') ? (
                <video
                  src={preview}
                  controls
                  className="w-full max-h-[200px]"
                />
              ) : null}
            </div>
          )}

          {!preview && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
