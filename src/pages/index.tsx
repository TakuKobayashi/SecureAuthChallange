import { useAuth } from '../context/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Top() {
  const router = useRouter();
  const { sessionToken } = useAuth();

  useEffect(() => {
    const isReady = router.isReady;
    // 未ログインであればリダイレクト
    if (isReady && sessionToken) {
      router.push('/signin');
    }
  }, [sessionToken, router]);

  return <p>トップ画面</p>;
}
