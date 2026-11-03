import React, { useState, useRef } from 'react';
import { Upload, Link2, Sparkles, X, Check, Image as ImageIcon } from 'lucide-react';

interface PresetOption {
  label: string;
  url: string;
}

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  helperText?: string;
  aspect?: 'square' | 'banner' | 'dish';
  type?: 'logo' | 'cover' | 'dish';
  lang?: 'ar' | 'fr';
}

// Curated high quality authentic presets for Algeria
const LOGO_PRESETS: PresetOption[] = [
  {
    label: 'شعار مطعم تقليدي / Traditionnel',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80'
  },
  {
    label: 'شعار فاست فود وبرغر / Fast Food',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'
  },
  {
    label: 'شعار بيتزا إيطالية جزائرية / Pizzeria',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80'
  },
  {
    label: 'شعار مقهى ومشروبات / Café & Barista',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80'
  },
  {
    label: 'شعار مشاوي وشواء / Grillades DZ',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80'
  }
];

const COVER_PRESETS: PresetOption[] = [
  {
    label: 'صالة مطعم راقية / Restaurant raffiné',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
  },
  {
    label: 'واجهة مطعم عصرية / Façade Moderne',
    url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80'
  },
  {
    label: 'مطعم مأكولات سريعة / Fast Food DZ',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80'
  },
  {
    label: 'ركن البيتزا والمخبوزات / Four à Pizza',
    url: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1200&q=80'
  },
  {
    label: 'أجواء عائلية مريحة / Cadre Familial',
    url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80'
  }
];

const DISH_PRESETS: PresetOption[] = [
  {
    label: 'رشتة عاصمية / Rechta',
    url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80'
  },
  {
    label: 'كسكسي جزائري / Couscous DZ',
    url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80'
  },
  {
    label: 'شخشوخة بسكرية / Chakhchoukha',
    url: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80'
  },
  {
    label: 'طاجين زيتون ودجاج / Tajine',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'
  },
  {
    label: 'بيتزا كاري وباركيتا / Pizza Carrée',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'
  },
  {
    label: 'برغر لحم دبل / Double Burger',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'
  },
  {
    label: 'سندويش شاورما / Shawarma',
    url: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=800&q=80'
  },
  {
    label: 'شواء وكفتة مشوية / Brochettes Grillées',
    url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80'
  },
  {
    label: 'سلطة مشكلة طازجة / Salade Fraîche',
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80'
  },
  {
    label: 'مشروب منعش / Boisson Fraîche',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80'
  }
];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label,
  helperText,
  aspect = 'dish',
  type = 'dish',
  lang = 'ar'
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'preset' | 'url'>('upload');
  const [customUrl, setCustomUrl] = useState(value || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const presets =
    type === 'logo'
      ? LOGO_PRESETS
      : type === 'cover'
      ? COVER_PRESETS
      : DISH_PRESETS;

  // Process and resize image file to keep payload compact and lightning fast
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(lang === 'ar' ? 'يرجى اختيار ملف صورة صالح' : 'Veuillez sélectionner un fichier image valide');
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Target dimensions depending on aspect
          const maxDim = type === 'cover' ? 1200 : 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Export compressed JPEG data URL
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
            onChange(compressedDataUrl);
            setCustomUrl(compressedDataUrl);
          } else {
            onChange(event.target?.result as string);
            setCustomUrl(event.target?.result as string);
          }
        } catch {
          onChange(event.target?.result as string);
          setCustomUrl(event.target?.result as string);
        } finally {
          setIsProcessing(false);
        }
      };

      img.onerror = () => {
        setIsProcessing(false);
        alert(lang === 'ar' ? 'حدث خطأ أثناء قراءة الصورة' : 'Erreur lors du chargement de l\'image');
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setIsProcessing(false);
      alert(lang === 'ar' ? 'فشل قراءة الملف' : 'Échec de la lecture du fichier');
    };

    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onChange(customUrl.trim());
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-800">
          {label}
        </label>
        {helperText && (
          <span className="text-[11px] text-slate-400">{helperText}</span>
        )}
      </div>

      {/* Main Image Preview & Controls */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3">
        {/* Preview Container */}
        <div className="relative overflow-hidden rounded-xl bg-slate-200/80 border border-slate-300 flex items-center justify-center">
          {value ? (
            <div className={`w-full relative group ${
              aspect === 'square' ? 'h-32 sm:h-36' : aspect === 'banner' ? 'h-36 sm:h-44' : 'h-36'
            }`}>
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-bold shadow hover:bg-white transition flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تغيير' : 'Changer'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setCustomUrl('');
                  }}
                  className="p-1.5 rounded-lg bg-red-600 text-white shadow hover:bg-red-700 transition cursor-pointer"
                  title={lang === 'ar' ? 'حذف الصورة' : 'Supprimer'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className={`w-full flex flex-col items-center justify-center text-slate-400 p-4 ${
              aspect === 'square' ? 'h-28' : 'h-32'
            }`}>
              <ImageIcon className="w-8 h-8 mb-1.5 opacity-60" />
              <p className="text-xs font-medium">
                {lang === 'ar' ? 'لم يتم تحديد صورة بعد' : 'Aucune image sélectionnée'}
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center text-xs font-bold text-blue-600">
              <span className="animate-spin me-2">⏳</span>
              {lang === 'ar' ? 'جاري معالجة وضغط الصورة...' : 'Traitement de l\'image...'}
            </div>
          )}
        </div>

        {/* Input Method Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'upload'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'رفع من الجهاز' : 'Téléverser'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('preset')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'preset'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{lang === 'ar' ? 'نماذج جاهزة' : 'Modèles DZ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('url')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'url'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'رابط مباشر' : 'Lien URL'}</span>
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Mode 1: Direct Device Upload */}
        {activeMode === 'upload' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/60 hover:bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>
                {lang === 'ar'
                  ? 'اختر صورة من الهاتف أو الحاسوب (كاميرا / ألبوم)'
                  : 'Sélectionner une photo depuis votre appareil'}
              </span>
            </button>
            <p className="text-[10px] text-slate-500 text-center">
              {lang === 'ar'
                ? 'يتم تحسين وضغط الصورة تلقائياً لتكون سريعة التحميل وخفيفة'
                : 'L\'image est automatiquement compressée et optimisée'}
            </p>
          </div>
        )}

        {/* Mode 2: Algerian Presets */}
        {activeMode === 'preset' && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500">
              {lang === 'ar'
                ? 'اختر صورة جاهزة عالية الجودة بنقرة واحدة:'
                : 'Choisissez une image prête en un clic :'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChange(preset.url);
                    setCustomUrl(preset.url);
                  }}
                  className={`group relative rounded-xl overflow-hidden border text-start cursor-pointer transition ${
                    value === preset.url
                      ? 'border-blue-600 ring-2 ring-blue-500/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-16 object-cover group-hover:scale-105 transition"
                  />
                  <div className="p-1 bg-white">
                    <p className="text-[10px] font-bold text-slate-800 truncate">
                      {preset.label}
                    </p>
                  </div>
                  {value === preset.url && (
                    <div className="absolute top-1 end-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mode 3: Direct URL */}
        {activeMode === 'url' && (
          <div className="flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="flex-1 p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleApplyCustomUrl}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow hover:bg-blue-700 transition cursor-pointer"
            >
              {lang === 'ar' ? 'تطبيق' : 'Appliquer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
