/**
 * Accessible FileUpload Primitive.
 * Features dual-input triggers:
 * 1) "Take photo" (environment camera capture)
 * 2) "Choose file" (standard file picker)
 * Client-side validation for file size (maxSizeMB) and accepted types.
 * Generates instant image previews via compressImage from lib/image.js.
 *
 * @prop {string} [accept] - Accepted file types (e.g. '.pdf,image/*')
 * @prop {boolean} [multiple=false] - Whether multiple files are allowed
 * @prop {number} [maxSizeMB=5] - Maximum allowed file size per item in Megabytes
 * @prop {Function} onChange - Callback receiving array of File objects: (files: File[]) => void
 * @prop {string} [label='Upload documents or photos'] - Accessible field group label
 * @prop {string} [className] - Additional styling classes
 */

import { useState, useRef } from 'react';
import Icon from './icons.jsx';
import Button from './Button.jsx';
import { compressImage } from '../../lib/image.js';

export default function FileUpload({
  accept = '*/*',
  multiple = false,
  maxSizeMB = 5,
  onChange,
  label = 'Upload documents or photos',
  className = ''
}) {
  const [fileList, setFileList] = useState([]); // Array of { id, file, preview, error }
  const [generalError, setGeneralError] = useState('');

  const photoInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const formatFileSize = bytes => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processIncomingFiles = async incomingFileList => {
    const rawFiles = Array.from(incomingFileList);
    if (rawFiles.length === 0) return;

    setGeneralError('');
    const maxBytes = maxSizeMB * 1024 * 1024;
    const processedItems = [];

    for (const file of rawFiles) {
      let fileError = '';
      if (file.size > maxBytes) {
        fileError = `File exceeds ${maxSizeMB}MB limit (${formatFileSize(file.size)})`;
      }

      let preview = null;
      if (file.type.startsWith('image/')) {
        try {
          preview = await compressImage(file, { maxWidth: 160, maxHeight: 160 });
        } catch (_err) {
          preview = null;
        }
      }

      processedItems.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        preview,
        error: fileError
      });
    }

    const updatedList = multiple ? [...fileList, ...processedItems] : processedItems;
    setFileList(updatedList);

    // Notify caller with valid File objects only
    const validFiles = updatedList.filter(item => !item.error).map(item => item.file);
    if (onChange) {
      onChange(validFiles);
    }
  };

  const handleRemove = idToRemove => {
    const updatedList = fileList.filter(item => item.id !== idToRemove);
    setFileList(updatedList);
    const validFiles = updatedList.filter(item => !item.error).map(item => item.file);
    if (onChange) {
      onChange(validFiles);
    }
  };

  return (
    <div className={`card-padded space-y-4 ${className}`}>
      {/* Label & Instructions */}
      <div>
        <p className="field-label text-base">{label}</p>
        <p className="text-xs text-neutral-muted">
          Max file size: {maxSizeMB}MB per file. Accepted formats: {accept === '*/*' ? 'All files' : accept}.
        </p>
      </div>

      {/* Hidden Native File Inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          processIncomingFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={e => {
          processIncomingFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Dual Clear Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="md"
          icon={<Icon name="camera" className="h-5 w-5" />}
          onClick={() => photoInputRef.current?.click()}
        >
          Take photo
        </Button>

        <Button
          type="button"
          variant="outline"
          size="md"
          icon={<Icon name="upload" className="h-5 w-5" />}
          onClick={() => fileInputRef.current?.click()}
        >
          Choose file
        </Button>
      </div>

      {/* General Error Notice */}
      {generalError && (
        <p className="text-sm font-semibold text-task-overdue" role="alert">
          {generalError}
        </p>
      )}

      {/* Selected Files List: Previews and Chips */}
      {fileList.length > 0 && (
        <ul className="mt-3 space-y-2.5" aria-label="Attached files list">
          {fileList.map(item => (
            <li
              key={item.id}
              className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 transition-colors ${
                item.error
                  ? 'border-task-overdue-border bg-task-overdue-tint/40'
                  : 'border-brand-green-tint bg-neutral-bg/50'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                {/* Thumbnail Preview or Document Icon */}
                {item.preview ? (
                  <img
                    src={item.preview}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-md object-cover border border-brand-green-tint bg-white"
                  />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-white border border-brand-green-tint text-brand-green">
                    <Icon name="file" className="h-6 w-6" />
                  </div>
                )}

                {/* File Metadata */}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-ink">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-neutral-muted">
                    {formatFileSize(item.file.size)}
                  </p>
                  {item.error && (
                    <p className="mt-0.5 text-xs font-semibold text-task-overdue" role="alert">
                      {item.error}
                    </p>
                  )}
                </div>
              </div>

              {/* Remove Action Button (44px min touch target) */}
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="grid min-h-tap min-w-tap place-items-center rounded-lg text-neutral-muted hover:bg-white hover:text-task-overdue focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow"
                aria-label={`Remove ${item.file.name}`}
              >
                <Icon name="trash" className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
