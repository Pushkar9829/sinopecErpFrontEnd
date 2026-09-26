import { useLocation, useNavigate } from 'react-router-dom';

export function useGoBack(fallback) {
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate(fallback);
  };
}

export function BackButton({ fallback, label = 'Back', className = '' }) {
  const goBack = useGoBack(fallback);

  return (
    <button
      type="button"
      onClick={goBack}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper ${className}`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}
