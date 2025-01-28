import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/auth';

const port = process.env.PORT || 3000;
process.env.NEXT_PUBLIC_BASE_URL = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
} 