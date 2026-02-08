import { useState, useCallback } from 'react';

function FileUpload({ onFileSelect, onLoadExample }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-16 text-center transition-colors cursor-pointer
        ${isDragging
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white/50 dark:bg-gray-800/50'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input').click()}
    >
      <input
        id="file-input"
        type="file"
        accept=".parquet"
        onChange={handleFileInput}
        className="hidden"
      />

      <svg
        className="mx-auto h-14 w-14 text-gray-400 dark:text-gray-500 mb-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>

      <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
        Drop a Parquet file here or click to browse
      </p>

      {onLoadExample && (
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
          or{' '}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLoadExample();
            }}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline decoration-blue-600/50 dark:decoration-blue-400/50 hover:decoration-blue-500 dark:hover:decoration-blue-300 underline-offset-2 transition-colors font-medium"
          >
            try an example file
          </button>
        </p>
      )}

      <p className="mt-12 text-sm text-gray-500">
        The file will be parsed locally in your browser, no data leaves your device
      </p>
    </div>
  );
}

export default FileUpload;
