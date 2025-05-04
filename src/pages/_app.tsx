import Layout from '@app/compoments/layout';
import UserGuard from '@app/compoments/user-guard';
import { AuthProvider } from '@app/context/auth';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Layout>
        <UserGuard>
          <Component {...pageProps} />
        </UserGuard>
      </Layout>
    </AuthProvider>
  );
}
