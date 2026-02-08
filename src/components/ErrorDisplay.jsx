function ErrorDisplay({ message, onDismiss }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-6 text-center">
      <svg
        className="mx-auto h-12 w-12 text-red-500 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>

      <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
        Failed to parse file
      </h3>
      <p className="text-red-600/80 dark:text-red-300/80 mb-4 font-mono text-sm">
        {message}
      </p>

      <button
        onClick={onDismiss}
        className="px-4 py-2 bg-red-600 dark:bg-red-700 hover:bg-red-500 dark:hover:bg-red-600 rounded-md text-white transition-colors"
      >
        Try another file
      </button>
    </div>
  );
}

export default ErrorDisplay;
