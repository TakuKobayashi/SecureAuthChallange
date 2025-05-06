import { SessionTokenKey } from '../commons/localstorage-const-keys';
import { useAuth } from '../context/auth';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/router';

const UserGuard = ({ children }: { children: ((user: any) => ReactNode) | ReactNode }) => {
  const { sessionToken, setSessionToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const isReady = router.isReady;
    if (!sessionToken) {
      const storageSessionToken = window.localStorage.getItem(SessionTokenKey);
      if (storageSessionToken) {
        setSessionToken(storageSessionToken);
        return;
      }
    }
    const escapePathes = ['/signin', '/signup', '/extraauth'];
    // 未ログインであればリダイレクト
    if (isReady && !sessionToken && !escapePathes.includes(router.pathname)) {
      router.push('/signin');
    }
  }, [sessionToken, setSessionToken, router]);

  if (typeof children === 'function') {
    // 関数であればユーザー情報を渡して実行
    return <>{children(sessionToken)}</>;
  } else {
    // Nodeであればそのまま表示
    return <>{children}</>;
  }
};

export default UserGuard;
