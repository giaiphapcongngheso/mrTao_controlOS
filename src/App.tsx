import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes/router';
import { Toaster } from '../share/ui';
import { ThemeProvider } from 'next-themes';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}


