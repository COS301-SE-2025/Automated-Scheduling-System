import * as React from 'react';
import api from '@/services/api';

export function useFetch<T = any>(url: string) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    interface ApiResponse<T> {
        data: T;
    }

    interface ApiError {
        message?: string;
    }

    api.get<ApiResponse<T>>(url)
        .then((res) => {
            if (!mounted) return;
            setData(res.data.data as T);
        })
        .catch((err: ApiError) => {
            if (!mounted) return;
            setError(err?.message ?? 'Failed to fetch');
        })
        .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [url]);

  return { data, loading, error } as const;
}
