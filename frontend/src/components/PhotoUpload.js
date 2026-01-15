import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Camera, Upload, X, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const PHOTO_TYPES = [
  { value: "before", label: "Before Repair" },
  { value: "damage", label: "Damage/Issue" },
  { value: "after", label: "After Repair" },
];

export default function PhotoUpload({ jobId, photos = [], onPhotoChange }) {
  const [uploading, setUploading] = useState(false);
  const [photoType, setPhotoType] = useState("before");
  const [deletingId, setDeletingId] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    const uploadedPhotos = [];

    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("photo_type", photoType);

      try {
        const response = await axios.post(`${API}/jobs/${jobId}/photos`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedPhotos.push(response.data.photo);
        toast.success(`Photo uploaded: ${file.name}`);
      } catch (error) {
        toast.error(error.response?.data?.detail || `Failed to upload ${file.name}`);
      }
    }

    if (uploadedPhotos.length > 0 && onPhotoChange) {
      onPhotoChange([...photos, ...uploadedPhotos]);
    }
    setUploading(false);
  }, [jobId, photoType, photos, onPhotoChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  const handleDelete = async (photoId) => {
    setDeletingId(photoId);
    try {
      await axios.delete(`${API}/jobs/${jobId}/photos/${photoId}`);
      if (onPhotoChange) {
        onPhotoChange(photos.filter((p) => p.id !== photoId));
      }
      toast.success("Photo deleted");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete photo");
    } finally {
      setDeletingId(null);
    }
  };

  const groupedPhotos = photos.reduce((acc, photo) => {
    const type = photo.type || "before";
    if (!acc[type]) acc[type] = [];
    acc[type].push(photo);
    return acc;
  }, {});

  return (
    <div className="space-y-4" data-testid="photo-upload-section">
      {/* Upload Section */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <Select value={photoType} onValueChange={setPhotoType}>
            <SelectTrigger data-testid="photo-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHOTO_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        data-testid="photo-dropzone"
      >
        <input {...getInputProps()} data-testid="photo-input" />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <p className="font-medium">
              {isDragActive ? "Drop photos here" : "Drag & drop photos here"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to select files (max 10MB each)
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: JPG, PNG, WebP, HEIC
            </p>
          </div>
        )}
      </div>

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <div className="space-y-4">
          {PHOTO_TYPES.map((type) => {
            const typePhotos = groupedPhotos[type.value] || [];
            if (typePhotos.length === 0) return null;

            return (
              <div key={type.value}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {type.label} ({typePhotos.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {typePhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
                      data-testid={`photo-${photo.id}`}
                    >
                      <img
                        src={`${BACKEND_URL}${photo.url}`}
                        alt={`${type.label}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='1'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='m21 15-5-5L5 21'/%3E%3C/svg%3E";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(photo.id)}
                          disabled={deletingId === photo.id}
                          data-testid={`delete-photo-${photo.id}`}
                        >
                          {deletingId === photo.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No photos uploaded yet</p>
        </div>
      )}
    </div>
  );
}
