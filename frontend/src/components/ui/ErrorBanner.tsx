import { Spinner } from "./Spinner";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

export function ErrorBanner({ message, onRetry, retrying = false, className = "" }: ErrorBannerProps) {
  return (
    <div className={`error-banner ${className}`.trim()} role="alert">
      <span>⚠️ {message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className="btn btn-danger btn-sm"
          style={{ minWidth: "72px" }}
        >
          {retrying ? <Spinner /> : "🔄 Retry"}
        </button>
      )}
    </div>
  );
}
