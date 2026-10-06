import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type SeoEntry = {
  title: string;
  description: string;
  noIndex?: boolean;
};

const defaultSeo: SeoEntry = {
  title: 'Omnifile - Free Online PDF, Image & Audio Tools',
  description:
    'All-in-one online PDF, image, and audio toolkit. Convert and edit files, compress and organize PDFs, enhance images, and process audio in your browser.',
};

const seoByPath: Record<string, SeoEntry> = {
  '/dashboard': defaultSeo,
  '/pdf': {
    title: 'Free Online PDF Tools - Convert, Compress & Edit | Omnifile',
    description: 'Convert, compress, merge, split, OCR, and edit PDF files online with Omnifile.',
  },
  '/pdf/pdf-to-jpg': {
    title: 'PDF to JPG Online Free - Convert PDF to JPG | Omnifile',
    description: 'Convert every PDF page into a high-quality JPG image online for free. Fast, simple, and no software installation required.',
  },
  '/pdf/pdf-to-jpeg': {
    title: 'PDF to JPEG Online Free - Convert PDF to JPEG | Omnifile',
    description: 'Convert PDF pages to high-quality JPEG images quickly and easily in your browser.',
  },
  '/pdf/pdf-to-png': {
    title: 'PDF to PNG Online Free - Convert PDF to PNG | Omnifile',
    description: 'Turn PDF pages into crisp, high-quality PNG images online with Omnifile.',
  },
  '/pdf/pdf-to-webp': {
    title: 'PDF to WebP Online - Convert PDF to WebP | Omnifile',
    description: 'Convert PDF pages to compact, high-quality WebP images directly in your browser.',
  },
  '/pdf/pdf-to-avif': {
    title: 'PDF to AVIF Online - Convert PDF to AVIF | Omnifile',
    description: 'Convert PDF pages into modern AVIF images with efficient compression and high visual quality.',
  },
  '/pdf/pdf-to-word': {
    title: 'PDF to Word Online Free - Convert PDF to DOCX | Omnifile',
    description: 'Convert PDF documents into editable Word DOCX files online with Omnifile.',
  },
  '/pdf/pdf-to-excel': {
    title: 'PDF to Excel Online - Convert PDF Tables to XLSX | Omnifile',
    description: 'Extract tables and data from PDF documents into editable Excel XLSX spreadsheets.',
  },
  '/pdf/merge-pdf': {
    title: 'Merge PDF Online Free - Combine PDF Files | Omnifile',
    description: 'Combine multiple PDF files into one document and arrange them in your preferred order.',
  },
  '/pdf/split-pdf': {
    title: 'Split PDF Online Free - Extract PDF Pages | Omnifile',
    description: 'Split PDF pages or extract specific page ranges into new documents online.',
  },
  '/pdf/remove-pdf': {
    title: 'Remove PDF Pages Online Free | Omnifile',
    description: 'Select and remove unwanted pages from a PDF document quickly and securely.',
  },
  '/pdf/compress-pdf': {
    title: 'Compress PDF Online Free - Reduce PDF File Size | Omnifile',
    description: 'Reduce PDF file size while preserving quality with the Omnifile online PDF compressor.',
  },
  '/pdf/ocr-pdf': {
    title: 'OCR PDF Online - Convert Scanned PDF to Text | Omnifile',
    description: 'Recognize and extract text from scanned PDFs to create searchable documents.',
  },
  '/image': {
    title: 'Free Online Image Tools - Convert, Compress & Edit | Omnifile',
    description: 'Convert, compress, crop, remove backgrounds, and upscale images online with Omnifile.',
  },
  '/image/image-converter': {
    title: 'Free Online Image Converter - JPG, PNG, WebP & AVIF | Omnifile',
    description: 'Convert images between JPG, PNG, WebP, AVIF, TIFF, BMP, GIF, and ICO directly in your browser.',
  },
  '/image/compress': {
    title: 'Compress Images Online Free - Reduce JPG & PNG Size | Omnifile',
    description: 'Reduce JPG, PNG, WebP, and AVIF file sizes while preserving visual quality.',
  },
  '/image/crop': {
    title: 'Crop Images Online Free - Crop Photos | Omnifile',
    description: 'Crop and resize images online quickly without installing any software.',
  },
  '/image/remove-bg': {
    title: 'Remove Image Background Online Free | Omnifile',
    description: 'Automatically remove image backgrounds and download transparent PNG results online.',
  },
  '/image/upscale': {
    title: 'AI Image Upscaler Online - Enhance Images 2x & 4x | Omnifile',
    description: 'Upscale images by 2x or 4x and enhance photo resolution and sharpness online with Omnifile.',
  },
  '/audio': {
    title: 'Free Online Audio Tools - Convert & Optimize Audio | Omnifile',
    description: 'Convert and optimize audio files online with fast, browser-friendly tools from Omnifile.',
  },
  '/login': {
    title: 'Sign In to Omnifile',
    description: 'Sign in to your Omnifile account.',
    noIndex: true,
  },
};

function setMeta(selector: string, value: string) {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', value);
}

export default function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = seoByPath[pathname] ?? {
      title: 'Page Not Found | Omnifile',
      description: 'The page you are looking for could not be found.',
      noIndex: true,
    };
    const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.replace(/\/$/, '');
    const siteUrl = configuredSiteUrl || window.location.origin;
    const canonicalUrl = `${siteUrl}${pathname === '/dashboard' ? '/' : pathname}`;

    document.title = seo.title;
    setMeta('meta[name="description"]', seo.description);
    setMeta('meta[name="robots"]', seo.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('meta[property="og:title"]', seo.title);
    setMeta('meta[property="og:description"]', seo.description);
    setMeta('meta[property="og:url"]', canonicalUrl);
    setMeta('meta[name="twitter:title"]', seo.title);
    setMeta('meta[name="twitter:description"]', seo.description);
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonicalUrl);
  }, [pathname]);

  return null;
}
