import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Passkey() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings');
  }, [router]);

  return null;
}
