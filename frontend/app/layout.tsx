import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './context/SocketContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Restaurante App',
  description: 'Aplicación para gestión de restaurante',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
          <SocketProvider>
            {children}
            <Toaster position="top-right" />
          </SocketProvider>
      </body>
    </html>
  );
}