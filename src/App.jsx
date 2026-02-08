import { useState, useCallback } from 'react';
import { parseParquetFile, parseParquetFileStreaming } from './parquetParser.js';
import FileUpload from './components/FileUpload.jsx';
import HierarchicalView from './components/hierarchical/index.jsx';
import FileLayoutDiagram from './components/FileLayoutDiagram.jsx';
import FileMetadataHeader from './components/FileMetadataHeader.jsx';
import ErrorDisplay from './components/ErrorDisplay.jsx';
import { useTheme } from './hooks/useTheme.js';

function ThemeToggle({ theme, toggleTheme }) {
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const [parquetData, setParquetData] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      // Use streaming parser which only reads necessary parts of the file
      // This works with files of any size (even 14GB+)
      const data = await parseParquetFileStreaming(file);
      setParquetData(data);
    } catch (err) {
      setError(err.message || 'Failed to parse Parquet file');
      setParquetData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoadExample = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFileName('example_file.parquet');

    try {
      const response = await fetch('/example_file.parquet');
      if (!response.ok) {
        throw new Error('Failed to load example file');
      }
      const buffer = await response.arrayBuffer();
      const data = await parseParquetFile(buffer);
      setParquetData(data);
    } catch (err) {
      setError(err.message || 'Failed to load example file');
      setParquetData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setParquetData(null);
    setFileName(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col overflow-x-hidden transition-colors">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <img src="/apple-touch-icon.png" alt="Parquetastic" className="w-8 h-8" />
            <a href="/" className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Parquetastic</a> <span className="text-gray-500 dark:text-gray-400 text-md font-normal">Parquet Metadata Inspector</span>
          </h1>
          <div className="flex items-center gap-3">
            {parquetData && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Load New File
              </button>
            )}
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {!parquetData && !loading && (
          <FileUpload onFileSelect={handleFileSelect} onLoadExample={handleLoadExample} />
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Parsing {fileName}...</p>
            </div>
          </div>
        )}

        {error && <ErrorDisplay message={error} onDismiss={handleReset} />}

        {parquetData && (
          <div className="space-y-6">
            {/* File Metadata Header */}
            <FileMetadataHeader fileName={fileName} data={parquetData} />

            {/* File Layout Diagram */}
            <FileLayoutDiagram data={parquetData} />

            {/* Hierarchical View */}
            <HierarchicalView data={parquetData} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
            <p className="text-center md:text-left">
              Built by{' '}
              <a
                href="https://pfisterer.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 visited:text-blue-600 dark:visited:text-blue-400 active:text-blue-600 dark:active:text-blue-400 transition-colors underline decoration-blue-600/50 dark:decoration-blue-400/50 hover:decoration-blue-500 dark:hover:decoration-blue-300 underline-offset-2"
              >
                Florian Pfisterer
              </a>
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/FlorianPfisterer/parquetastic/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 visited:text-gray-500 dark:visited:text-gray-400 transition-colors"
              >
                Report an issue
              </a>
              <a
                href="https://pfisterer.dev/imprint/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 visited:text-gray-500 dark:visited:text-gray-400 transition-colors"
              >
                Imprint
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
