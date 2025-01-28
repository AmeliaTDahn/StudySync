import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/auth';

if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  process.env.NEXT_PUBLIC_BASE_URL = `http://0.0.0.0:${port}`;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
} 