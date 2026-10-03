import PageLoader from '@/components/common/page-loader';
import MainLayout from '@/components/layout/main-layout';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/theme-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useLocation,
    useNavigate,
    type Location,
} from 'react-router-dom';
import { Toaster } from 'sonner';

const DashboardPage = lazy(() => import('@/pages/dashboard'));
const AudioPage = lazy(() => import('@/pages/audio/audio'));
const ImagePage = lazy(() => import('@/pages/image/image'));

const PDFPage = lazy(() => import('@/pages/pdf/pdf'));
const PdfToJpgPage = lazy(() => import('@/pages/pdf/pdf-to-jpg/page'));
const PdfToJpegPage = lazy(() => import('@/pages/pdf/pdf-to-jpeg/page'));
const PdfToPngPage = lazy(() => import('@/pages/pdf/pdf-to-png/page'));
const PdfToWebpPage = lazy(() => import('@/pages/pdf/pdf-to-webp/page'));
const PdfToAvifPage = lazy(() => import('@/pages/pdf/pdf-to-avif/page'));
const PdfToExcelPage = lazy(() => import('@/pages/pdf/pdf-to-excel/page'));
const PdfToWordPage = lazy(() => import('@/pages/pdf/pdf-to-word/page'));
const MergePdfPage = lazy(() => import('@/pages/pdf/merge-pdf/page'));
const SplitPdfPage = lazy(() => import('@/pages/pdf/split-pdf/page'));
const RemovePdfPage = lazy(() => import('@/pages/pdf/remove-pdf/page'));
const CompressPdfPage = lazy(() => import('@/pages/pdf/compress-pdf/page'));
const LoginPage = lazy(() => import('@/pages/auth/login'));
const RegisterPage = lazy(() => import('@/pages/auth/register'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/forgot-password'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/reset-password'));
const NotFoundPage = lazy(() => import('@/pages/not-found'));

type AuthLocationState = {
  backgroundLocation?: Location;
};

function AuthOverlay({
  backgroundLocation,
  children,
}: {
  backgroundLocation?: Location;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const closeOverlay = useCallback(() => {
    if (backgroundLocation) {
      navigate(backgroundLocation, { replace: true });
      return;
    }

    navigate(-1);
  }, [backgroundLocation, navigate]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeOverlay();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOverlay]);

  return (
    <div
      className={cn(
        'fixed',
        'inset-0',
        'z-50',
        'overflow-y-auto',
        'bg-gray-950/35',
        'p-4',
        'backdrop-blur-md',
        'sm:p-8',
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Authentication"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeOverlay();
        }
      }}
    >
      <button
        type="button"
        aria-label="Close authentication dialog"
        onClick={closeOverlay}
        className={cn(
          'fixed',
          'right-4',
          'top-4',
          'z-10',
          'flex',
          'h-11',
          'w-11',
          'items-center',
          'justify-center',
          'rounded-xl',
          'border-3',
          'border-gray-900',
          'bg-white',
          'text-gray-900',
          'shadow-[4px_4px_0_0_#111827]',
          'cursor-pointer',
          'dark:border-gray-700',
          'dark:bg-[#16181d]',
          'dark:text-white',
          'dark:shadow-[4px_4px_0_0_#000]',
        )}
      >
        <X className={cn('h-5', 'w-5')} />
      </button>
      <div
        className={cn('flex', 'min-h-full', 'items-center', 'justify-center')}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeOverlay();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const locationState = location.state as AuthLocationState | null;
  const isAuthRoute =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password';
  const fallbackBackground = isAuthRoute
    ? { ...location, pathname: '/dashboard', search: '', hash: '' }
    : location;
  const backgroundLocation = locationState?.backgroundLocation ?? fallbackBackground;

  return (
    <>
      <Routes location={backgroundLocation}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/audio" element={<AudioPage />} />
          <Route path="/image" element={<ImagePage />} />
          <Route path="/pdf" element={<PDFPage />} />
          <Route path="/pdf/pdf-to-jpg" element={<PdfToJpgPage />} />
          <Route path="/pdf/pdf-to-jpeg" element={<PdfToJpegPage />} />
          <Route path="/pdf/pdf-to-png" element={<PdfToPngPage />} />
          <Route path="/pdf/pdf-to-webp" element={<PdfToWebpPage />} />
          <Route path="/pdf/pdf-to-avif" element={<PdfToAvifPage />} />
          <Route path="/pdf/pdf-to-excel" element={<PdfToExcelPage />} />
          <Route path="/pdf/pdf-to-word" element={<PdfToWordPage />} />
          <Route path="/pdf/merge-pdf" element={<MergePdfPage />} />
          <Route path="/pdf/split-pdf" element={<SplitPdfPage />} />
          <Route path="/pdf/remove-pdf" element={<RemovePdfPage />} />
          <Route path="/pdf/compress-pdf" element={<CompressPdfPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {isAuthRoute && (
        <Routes>
          <Route
            path="/login"
            element={
              <AuthOverlay backgroundLocation={locationState?.backgroundLocation}>
                <LoginPage />
              </AuthOverlay>
            }
          />
          <Route
            path="/register"
            element={
              <AuthOverlay backgroundLocation={locationState?.backgroundLocation}>
                <RegisterPage />
              </AuthOverlay>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <AuthOverlay backgroundLocation={locationState?.backgroundLocation}>
                <ForgotPasswordPage />
              </AuthOverlay>
            }
          />
          <Route
            path="/reset-password"
            element={
              <AuthOverlay backgroundLocation={locationState?.backgroundLocation}>
                <ResetPasswordPage />
              </AuthOverlay>
            }
          />
        </Routes>
      )}
    </>
  );
}

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
          <AppRoutes />
        </Suspense>
        <Toaster position="top-center" theme={theme} richColors closeButton duration={4000} />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
