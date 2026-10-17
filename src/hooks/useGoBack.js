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
