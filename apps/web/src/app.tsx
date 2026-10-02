import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useThemeStore } from '@/store/theme-store';
import PageLoader from '@/components/common/page-loader';
import MainLayout from '@/components/layout/main-layout';

// Lazy loaded pages
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const ConvertersPage = lazy(() => import('@/pages/converters'));
const MediaToolsPage = lazy(() => import('@/pages/media-tools'));
const PDFPage = lazy(() => import('@/pages/pdf'));
const LoginPage = lazy(() => import('@/pages/login'));
const RegisterPage = lazy(() => import('@/pages/register'));
const NotFoundPage = lazy(() => import('@/pages/not-found'));

export const App: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 15,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/converters" element={<ConvertersPage />} />
              <Route path="/media-tools" element={<MediaToolsPage />} />
              <Route path="/pdf" element={<PDFPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <Toaster position="top-center" theme={theme} richColors closeButton duration={4000} />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
