import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes/router';
import { Toaster } from '../share/ui';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

