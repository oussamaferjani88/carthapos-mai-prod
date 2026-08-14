import { useEffect, useState } from 'react';
import api from '../lib/api';

export function useClientNameMap() {
  const [map, setMap] = useState({});

  useEffect(() => {
    let cancelled = false;
    api
      .get('/bi-uploads/clients/list')
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || [];
        const next = {};
        (Array.isArray(data) ? data : []).forEach((c) => {
          if (c.clientId) next[c.clientId] = c.name || c.clientId;
        });
        setMap(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return map;
}
