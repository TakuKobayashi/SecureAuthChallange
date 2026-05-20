import Layout from '@app/compoments/layout';
import UserGuard from '@app/compoments/user-guard';
import { AuthProvider } from '@app/context/auth';
import type { AppProps } from 'next/app';
import { ReactNode, useEffect, useState } from 'react';

const shouldRedirectToLocalhost = (hostname: string): boolean => {
  const normalizedHostname = hostname.replace(/^\[/, '').replace(/\]$/, '');
  return normalizedHostname === '0.0.0.0' || normalizedHostname === '::1' || /^127(?:\.\d{1,3}){3}$/.test(normalizedHostname);
};

const LocalhostRedirect = ({ children }: { children: ReactNode }) => {
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!shouldRedirectToLocalhost(window.location.hostname)) {
      return;
    }
    const nextUrl = new URL(window.location.href);
    nextUrl.hostname = 'localhost';
    setIsRedirecting(true);
    window.location.replace(nextUrl.toString());
  }, []);

  if (isRedirecting) {
    return null;
  }

  return <>{children}</>;
};

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LocalhostRedirect>
      <AuthProvider>
        <Layout>
          <UserGuard>
            <Component {...pageProps} />
          </UserGuard>
        </Layout>
      </AuthProvider>
    </LocalhostRedirect>
  );
}
