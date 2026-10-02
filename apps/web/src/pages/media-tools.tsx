import React, { useState } from 'react';
import { FileUp, Image, Maximize, Upload, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function MediaToolsPage() {
  const [activeTab, setActiveTab] = useState<'convert' | 'remove-bg' | 'upscale'>('convert');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = () => {
    if (!file) {
      toast.error('Please upload a file first!');
      return;
    }
    
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      toast.success(`${activeTab === 'convert' ? 'Conversion' : activeTab === 'remove-bg' ? 'Background removal' : 'Upscaling'} completed successfully!`);
    }, 2000);
  };

  return (
    <div className={cn("max-w-6xl", "mx-auto", "space-y-8", "font-sans", "pb-12")}>
      {/* Header */}
      <div className={cn("flex", "flex-col", "items-center", "text-center", "space-y-4", "mb-12", "pt-8")}>
        <span className={cn("inline-block", "px-4", "py-2", "rounded-full", "border-2", "border-gray-900", "bg-yellow-400", "font-bold", "text-sm", "text-gray-900", "shadow-[2px_2px_0_0_#111827]")}>
          Pro Tools
        </span>
        <h1 className={cn("text-4xl", "md:text-5xl", "font-bold", "text-gray-900", "dark:text-white", "tracking-tight")}>
          Magic Media Studio
        </h1>
        <p className={cn("text-gray-600", "dark:text-gray-400", "max-w-2xl", "text-lg", "font-medium", "mt-4")}>
          Transform your files, remove backgrounds, and upscale images in seconds.
        </p>
      </div>

      {/* Tabs */}
      <div className={cn("flex", "flex-wrap", "justify-center", "gap-4", "mb-8")}>
        {[
          { id: 'convert', label: 'File Converter', icon: FileUp },
          { id: 'remove-bg', label: 'Remove BG', icon: Image },
          { id: 'upscale', label: 'Upscale HD', icon: Maximize },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
                setActiveTab(tab.id as any);
                setFile(null);
            }}
            className={cn(
              "flex", "items-center", "gap-2", "px-6", "py-3", "rounded-2xl", "border-3", "border-gray-900", "dark:border-gray-700", "font-bold", "transition-all", "duration-200",
              activeTab === tab.id
                ? "bg-gray-900 text-white dark:bg-yellow-400 dark:text-gray-900 shadow-[4px_4px_0_0_#111827] translate-y-0"
                : "bg-white text-gray-900 dark:bg-[#1a1c22] dark:text-gray-100 shadow-none hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#111827] dark:hover:shadow-[4px_4px_0_0_#000]"
            )}
          >
            <tab.icon className={cn("w-5", "h-5")} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Card (Neobrutalism style) */}
      <div className={cn("bg-white", "dark:bg-[#16181d]", "rounded-3xl", "border-3", "border-gray-900", "dark:border-gray-700", "p-8", "shadow-[8px_8px_0_0_#111827]", "dark:shadow-[8px_8px_0_0_#000]", "max-w-3xl", "mx-auto")}>
        <div className={cn("flex", "flex-col", "items-center", "justify-center", "p-12", "border-3", "border-dashed", "border-gray-300", "dark:border-gray-700", "rounded-2xl", "bg-gray-50", "dark:bg-[#1e222a]", "hover:bg-[#fdfbf7]", "dark:hover:bg-[#252932]", "transition-colors", "relative", "cursor-pointer", "overflow-hidden", "group")}>
          <input 
            type="file" 
            className={cn("absolute", "inset-0", "w-full", "h-full", "opacity-0", "cursor-pointer", "z-10")} 
            onChange={handleFileChange}
            accept={activeTab === 'convert' ? '*' : 'image/*'}
          />
          
          {!file ? (
            <div className={cn("flex", "flex-col", "items-center", "text-center", "space-y-4")}>
              <div className={cn("w-16", "h-16", "rounded-2xl", "bg-yellow-400", "border-3", "border-gray-900", "flex", "items-center", "justify-center", "shadow-[4px_4px_0_0_#111827]", "group-hover:-translate-y-1", "transition-transform")}>
                <Upload className={cn("w-8", "h-8", "text-gray-900")} />
              </div>
              <div>
                <h3 className={cn("text-xl", "font-bold", "text-gray-900", "dark:text-white")}>Upload your file here</h3>
                <p className={cn("text-gray-500", "dark:text-gray-400", "font-medium", "mt-1")}>Drag and drop or click to browse</p>
              </div>
            </div>
          ) : (
            <div className={cn("flex", "flex-col", "items-center", "text-center", "space-y-4", "z-20")}>
              <div className={cn("w-16", "h-16", "rounded-2xl", "bg-emerald-400", "border-3", "border-gray-900", "flex", "items-center", "justify-center", "shadow-[4px_4px_0_0_#111827]")}>
                <FileUp className={cn("w-8", "h-8", "text-gray-900")} />
              </div>
              <div>
                <h3 className={cn("text-xl", "font-bold", "text-gray-900", "dark:text-white", "break-all")}>{file.name}</h3>
                <p className={cn("text-gray-500", "dark:text-gray-400", "font-medium", "mt-1")}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className={cn("text-red-500", "dark:text-red-400", "font-bold", "hover:underline")}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {activeTab === 'convert' && (
           <div className={cn("mt-8")}>
             <label className={cn("block", "text-sm", "font-bold", "text-gray-900", "dark:text-gray-100", "mb-2")}>Target Format</label>
             <select className={cn("w-full", "p-4", "rounded-xl", "border-3", "border-gray-900", "dark:border-gray-700", "font-bold", "focus:outline-none", "focus:ring-2", "focus:ring-yellow-400", "cursor-pointer", "bg-white", "dark:bg-[#1a1c22]", "text-gray-900", "dark:text-white")}>
                <option value="png">PNG Image</option>
                <option value="jpg">JPG Image</option>
                <option value="webp">WebP Image</option>
                <option value="avif">AVIF Image</option>
                <option value="pdf">PDF Document</option>
                <option value="docx">Word Document (DOCX)</option>
             </select>
           </div>
        )}
        
        {activeTab === 'upscale' && (
           <div className={cn("mt-8")}>
             <label className={cn("block", "text-sm", "font-bold", "text-gray-900", "dark:text-gray-100", "mb-2")}>Upscale Quality</label>
             <div className={cn("flex", "gap-4")}>
                <label className={cn("flex-1", "cursor-pointer")}>
                   <input type="radio" name="scale" className={cn("peer", "sr-only")} defaultChecked />
                   <div className={cn("p-4", "rounded-xl", "border-3", "border-gray-900", "dark:border-gray-700", "font-bold", "text-center", "peer-checked:bg-yellow-400", "peer-checked:text-gray-900", "peer-checked:shadow-[4px_4px_0_0_#111827]", "transition-all", "bg-white", "dark:bg-[#1a1c22]", "text-gray-900", "dark:text-white", "hover:bg-gray-50", "dark:hover:bg-gray-800")}>2x Scale (Fast)</div>
                </label>
                <label className={cn("flex-1", "cursor-pointer")}>
                   <input type="radio" name="scale" className={cn("peer", "sr-only")} />
                   <div className={cn("p-4", "rounded-xl", "border-3", "border-gray-900", "dark:border-gray-700", "font-bold", "text-center", "peer-checked:bg-yellow-400", "peer-checked:text-gray-900", "peer-checked:shadow-[4px_4px_0_0_#111827]", "transition-all", "bg-white", "dark:bg-[#1a1c22]", "text-gray-900", "dark:text-white", "hover:bg-gray-50", "dark:hover:bg-gray-800")}>4x Scale (HD)</div>
                </label>
             </div>
           </div>
        )}

        <button 
          disabled={!file || isProcessing}
          onClick={handleProcess}
          className={cn(
            "w-full", "mt-8", "px-6", "py-4", "bg-purple-400", "hover:bg-purple-500", "disabled:bg-gray-200", "dark:disabled:bg-gray-800", "disabled:text-gray-500", "dark:disabled:text-gray-600", "disabled:border-gray-400", "dark:disabled:border-gray-700", "disabled:cursor-not-allowed", "border-3", "border-gray-900", "dark:border-gray-700", "rounded-xl", "font-bold", "text-lg", "text-gray-900", "shadow-[4px_4px_0_0_#111827]", "dark:shadow-[4px_4px_0_0_#000]", "disabled:shadow-none", "hover:-translate-y-1", "disabled:translate-y-0", "transition-all", "flex", "items-center", "justify-center", "gap-2"
          )}
        >
          {isProcessing ? (
            <>
              <RefreshCw className={cn("w-6", "h-6", "animate-spin")} />
              Processing Magic...
            </>
          ) : (
            'Start Magic Processing'
          )}
        </button>
      </div>
    </div>
  );
}
