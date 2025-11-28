'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { Upload, FileImage, FileVideo, File, X, Play, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video' | 'other';
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: {
    'image/*': string[];
    'video/*': string[];
  };
  maxFiles?: number;
  maxSize?: number; // in bytes
  isUploading?: boolean;
}

const defaultAccept = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  'video/*': ['.mp4', '.webm', '.mov', '.avi']
};

export function FileUpload({
  onUpload,
  accept = defaultAccept,
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024, // 100MB
  isUploading = false
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const getFileType = (file: File): 'image' | 'video' | 'other' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'other';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        console.log('Rejected files:', rejectedFiles);
        // You could show error messages here
      }

      // Process accepted files
      const newFiles = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        type: getFileType(file),
        uploadProgress: 0,
        status: 'pending' as const
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles - uploadedFiles.length,
    maxSize,
    disabled: isUploading
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file && file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const handleUpload = async () => {
    const filesToUpload = uploadedFiles.filter((f) => f.status === 'pending').map((f) => f.file);
    
    if (filesToUpload.length === 0) return;

    try {
      // Update status to uploading
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.status === 'pending' ? { ...f, status: 'uploading' } : f
        )
      );

      // Call the upload handler
      await onUpload(filesToUpload);

      // Mark as completed
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading' ? { ...f, status: 'completed', uploadProgress: 100 } : f
        )
      );
    } catch {
      // Mark as error
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        )
      );
    }
  };

  const getFileIcon = (type: 'image' | 'video' | 'other') => {
    switch (type) {
      case 'image':
        return <FileImage className="w-8 h-8 text-secondary" />;
      case 'video':
        return <FileVideo className="w-8 h-8 text-primary" />;
      default:
        return <File className="w-8 h-8 text-text-secondary" />;
    }
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'error':
        return 'text-primary';
      case 'uploading':
        return 'text-secondary';
      default:
        return 'text-text-secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
          ${
            isDragActive
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50 hover:bg-surface/50'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4 ${
            isDragActive ? 'neon-glow' : ''
          }`}>
            <Upload className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-text-secondary'}`} />
          </div>
          
          {isDragActive ? (
            <p className="text-primary font-semibold">Drop files here...</p>
          ) : (
            <>
              <p className="text-text mb-2">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-text-secondary text-sm">
                Images and videos up to {formatFileSize(maxSize)}
              </p>
              <p className="text-text-secondary text-xs mt-1">
                Supported: JPG, PNG, GIF, WebP, MP4, WebM, MOV
              </p>
            </>
          )}
        </div>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-heading text-text">
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <Button
              onClick={handleUpload}
              disabled={isUploading || uploadedFiles.every((f) => f.status !== 'pending')}
              className="neon-glow"
            >
              {isUploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="bg-surface rounded-lg p-4 border border-border"
              >
                <div className="flex items-start space-x-3">
                  {/* File Preview/Icon */}
                  <div className="flex-shrink-0">
                    {uploadedFile.type === 'image' && uploadedFile.preview ? (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                        <Image
                          src={uploadedFile.preview}
                          alt={uploadedFile.file.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 hover:opacity-100 transition-opacity">
                          <Eye className="w-4 h-4 text-text" />
                        </div>
                      </div>
                    ) : uploadedFile.type === 'video' ? (
                      <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center relative">
                        <Play className="w-6 h-6 text-primary" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-surface rounded-lg flex items-center justify-center">
                        {getFileIcon(uploadedFile.type)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-medium truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-text-secondary text-sm">
                      {formatFileSize(uploadedFile.file.size)}
                    </p>
                    <p className={`text-sm font-medium ${getStatusColor(uploadedFile.status)}`}>
                      {uploadedFile.status === 'pending' && 'Ready to upload'}
                      {uploadedFile.status === 'uploading' && 'Uploading...'}
                      {uploadedFile.status === 'completed' && 'Upload complete'}
                      {uploadedFile.status === 'error' && (uploadedFile.error || 'Upload failed')}
                    </p>
                    
                    {/* Progress Bar */}
                    {uploadedFile.status === 'uploading' && (
                      <div className="mt-2 w-full bg-border rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadedFile.uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(uploadedFile.id)}
                    className="text-text-secondary hover:text-primary transition-colors"
                    disabled={uploadedFile.status === 'uploading'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}