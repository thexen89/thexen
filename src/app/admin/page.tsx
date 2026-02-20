'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/lib/types';
import AdminHexGrid from '@/components/AdminHexGrid';
import AdminMobileHexGrid from '@/components/AdminMobileHexGrid';

type EffectType = 'snow' | 'cherry' | 'leaves' | 'fireworks' | null;

const EFFECT_OPTIONS: { value: EffectType; label: string; icon: string }[] = [
  { value: null, label: '없음', icon: '⊘' },
  { value: 'snow', label: '눈', icon: '❄️' },
  { value: 'cherry', label: '벚꽃', icon: '🌸' },
  { value: 'leaves', label: '낙엽', icon: '🍂' },
  { value: 'fireworks', label: '불꽃놀이', icon: '🎆' },
];

function PanelPositionDragger2D({ x, y, onChange, label }: { x: number; y: number; onChange: (x: number, y: number) => void; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calcPos = useCallback((clientX: number, clientY: number) => {
    if (!trackRef.current) return { x, y };
    const rect = trackRef.current.getBoundingClientRect();
    const px = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
    const py = Math.round(Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)));
    return { x: px, y: py };
  }, [x, y]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const pos = calcPos(cx, cy);
      onChange(pos.x, pos.y);
    };
    const handleUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, onChange, calcPos]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const pos = calcPos(cx, cy);
    onChange(pos.x, pos.y);
  };

  return (
    <div
      ref={trackRef}
      className="relative w-[120px] h-[200px] bg-white/5 border border-white/20 rounded-lg cursor-pointer select-none"
      onMouseDown={handleStart}
      onTouchStart={handleStart}
    >
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
      <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10" />
      <div
        className={`absolute w-8 h-8 rounded-full border-2 flex items-center justify-center text-[7px] font-bold transition-colors ${
          isDragging ? 'border-white bg-white/30 text-white' : 'border-white/50 bg-white/10 text-white/60'
        }`}
        style={{
          left: `clamp(0px, calc(${x}% - 16px), calc(100% - 32px))`,
          top: `clamp(0px, calc(${y}% - 16px), calc(100% - 32px))`,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobile, setIsMobile] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [seasonalEffect, setSeasonalEffect] = useState<EffectType>(null);
  const [effectEnabled, setEffectEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);
  const [companyImages, setCompanyImages] = useState<string[]>([]);
  const [companyDescription, setCompanyDescription] = useState('');
  const [isUploadingCompanyImage, setIsUploadingCompanyImage] = useState(false);
  const [isSavingCompanySettings, setIsSavingCompanySettings] = useState(false);
  const [isLandingSettingsOpen, setIsLandingSettingsOpen] = useState(false);
  const [landingLogoImage, setLandingLogoImage] = useState<string | null>(null);
  const [landingBackgroundImage, setLandingBackgroundImage] = useState<string | null>(null);
  const [landingBackgroundType, setLandingBackgroundType] = useState<'tile' | 'cover'>('tile');
  const [landingEnterImage, setLandingEnterImage] = useState<string | null>(null);
  const [gridBackgroundColor, setGridBackgroundColor] = useState('#000000');
  const [headerLogoImage, setHeaderLogoImage] = useState<string | null>(null);
  const [isUploadingHeaderLogo, setIsUploadingHeaderLogo] = useState(false);
  const [isUploadingLandingLogo, setIsUploadingLandingLogo] = useState(false);
  const [isUploadingLandingBg, setIsUploadingLandingBg] = useState(false);
  const [isUploadingLandingEnter, setIsUploadingLandingEnter] = useState(false);
  const [isSavingLandingSettings, setIsSavingLandingSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const companyFileInputRef = useRef<HTMLInputElement>(null);
  const headerLogoInputRef = useRef<HTMLInputElement>(null);
  const landingLogoInputRef = useRef<HTMLInputElement>(null);
  const landingBgInputRef = useRef<HTMLInputElement>(null);
  const landingEnterInputRef = useRef<HTMLInputElement>(null);
  const [externalLinks, setExternalLinks] = useState<{image: string, url: string}[]>([]);
  const [isUploadingExternalLink, setIsUploadingExternalLink] = useState<number | null>(null);
  const externalLinkInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [leftPanelPositionX, setLeftPanelPositionX] = useState(50);
  const [leftPanelPositionY, setLeftPanelPositionY] = useState(50);
  const [rightPanelPositionX, setRightPanelPositionX] = useState(50);
  const [rightPanelPositionY, setRightPanelPositionY] = useState(50);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    client: '',
    images: [] as string[],
    thumbnailIndex: 0,
    description: '',
    showInfo: false,
    videoUrl: '',
  });

  useEffect(() => {
    loadProducts();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSeasonalEffect(data.seasonalEffect as EffectType);
      setEffectEnabled(data.effectEnabled);
      setCompanyImages(data.companyImages || []);
      setCompanyDescription(data.companyDescription || '');
      setLandingLogoImage(data.landingLogoImage || null);
      setLandingBackgroundImage(data.landingBackgroundImage || null);
      setLandingBackgroundType(data.landingBackgroundType || 'tile');
      setLandingEnterImage(data.landingEnterImage || null);
      setGridBackgroundColor(data.gridBackgroundColor || '#000000');
      setHeaderLogoImage(data.headerLogoImage || null);
      setExternalLinks(data.externalLinks || []);
      setLeftPanelPositionX(data.leftPanelPositionX ?? 50);
      setLeftPanelPositionY(data.leftPanelPositionY ?? 50);
      setRightPanelPositionX(data.rightPanelPositionX ?? 50);
      setRightPanelPositionY(data.rightPanelPositionY ?? 50);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonalEffect, effectEnabled }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      showMessage('success', '시즌 효과 설정이 저장되었습니다.');
      setIsSettingsOpen(false);
    } catch (err) {
      console.error('Failed to save settings:', err);
      showMessage('error', '설정 저장에 실패했습니다.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const saveCompanySettings = async () => {
    setIsSavingCompanySettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyImages, companyDescription }),
      });
      if (!res.ok) throw new Error('Failed to save company settings');
      showMessage('success', '회사 정보가 저장되었습니다.');
      setIsCompanySettingsOpen(false);
    } catch (err) {
      console.error('Failed to save company settings:', err);
      showMessage('error', '회사 정보 저장에 실패했습니다.');
    } finally {
      setIsSavingCompanySettings(false);
    }
  };

  const saveLandingSettings = async () => {
    setIsSavingLandingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landingLogoImage, landingBackgroundImage, landingBackgroundType, landingEnterImage, gridBackgroundColor, headerLogoImage, externalLinks, leftPanelPositionX, leftPanelPositionY, rightPanelPositionX, rightPanelPositionY }),
      });
      if (!res.ok) throw new Error('Failed to save landing settings');
      showMessage('success', '랜딩페이지 설정이 저장되었습니다.');
      setIsLandingSettingsOpen(false);
    } catch (err) {
      console.error('Failed to save landing settings:', err);
      showMessage('error', '랜딩페이지 설정 저장에 실패했습니다.');
    } finally {
      setIsSavingLandingSettings(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      showMessage('error', '제품 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        client: product.client,
        images: product.images.length > 0 ? product.images : [],
        thumbnailIndex: product.thumbnailIndex,
        description: product.description,
        showInfo: product.showInfo || false,
        videoUrl: product.videoUrl || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        client: '',
        images: [],
        thumbnailIndex: 0,
        description: '',
        showInfo: false,
        videoUrl: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      client: '',
      images: [],
      thumbnailIndex: 0,
      description: '',
      showInfo: false,
      videoUrl: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const cleanedImages = formData.images.filter(img => img.trim() !== '');
      const body = editingProduct
        ? { ...formData, images: cleanedImages, id: editingProduct.id, priority: editingProduct.priority }
        : { ...formData, images: cleanedImages, priority: products.length + 1 };

      const res = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save');

      await loadProducts();
      closeModal();
      showMessage('success', editingProduct ? '제품이 수정되었습니다.' : '제품이 추가되었습니다.');
    } catch (err) {
      console.error('Failed to save product:', err);
      showMessage('error', '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      await loadProducts();
      closeModal();
      showMessage('success', '제품이 삭제되었습니다.');
    } catch (err) {
      console.error('Failed to delete product:', err);
      showMessage('error', '삭제에 실패했습니다.');
    }
  };

  const handleReorder = async (newProducts: Product[]) => {
    // Optimistic update
    setProducts(newProducts);

    try {
      const res = await fetch('/api/products/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: newProducts }),
      });

      if (!res.ok) throw new Error('Failed to reorder');
      showMessage('success', '순서가 변경되었습니다.');
    } catch (err) {
      console.error('Failed to reorder products:', err);
      showMessage('error', '순서 변경에 실패했습니다.');
      await loadProducts();
    }
  };

  // 목록 뷰 드래그 앤 드롭 핸들러
  const handleListDragStart = (e: React.DragEvent, productId: string) => {
    setDraggedId(productId);
    e.dataTransfer.effectAllowed = 'move';
    // 드래그 이미지를 투명하게
    const dragImage = document.createElement('div');
    dragImage.style.opacity = '0';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleListDragOver = (e: React.DragEvent, productId: string) => {
    e.preventDefault();
    if (productId !== draggedId) {
      setDragOverId(productId);
    }
  };

  const handleListDragLeave = () => {
    setDragOverId(null);
  };

  const handleListDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const dragIndex = sortedProducts.findIndex(p => p.id === draggedId);
    const dropIndex = sortedProducts.findIndex(p => p.id === targetId);

    if (dragIndex === -1 || dropIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // 순서 변경
    const newProducts = [...sortedProducts];
    const [removed] = newProducts.splice(dragIndex, 1);
    newProducts.splice(dropIndex, 0, removed);

    // 우선순위 재할당
    const updates = newProducts.map((product, index) => ({
      ...product,
      priority: index + 1,
    }));

    handleReorder(updates);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleListDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const sortedProducts = [...products].sort((a, b) => a.priority - b.priority);

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <header className="border-b border-white/10 flex-shrink-0">
        <div className="max-w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <a href="/" className="text-lg md:text-xl font-black tracking-tighter">
              THEXEN
            </a>
            <span className="text-white/20 hidden md:inline">|</span>
            <span className="text-white/50 hidden md:inline text-sm">관리자</span>
            <span className="text-white/30 text-xs md:text-sm">({products.length})</span>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* 랜딩페이지 설정 버튼 */}
            <button
              onClick={() => setIsLandingSettingsOpen(true)}
              className={`px-3 py-2 rounded-lg transition-colors text-xs md:text-sm ${
                landingLogoImage || landingBackgroundImage
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="hidden md:inline">랜딩페이지</span>
              <span className="md:hidden">랜딩</span>
            </button>

            {/* 회사 정보 설정 버튼 */}
            <button
              onClick={() => setIsCompanySettingsOpen(true)}
              className={`px-3 py-2 rounded-lg transition-colors text-xs md:text-sm ${
                companyImages.length > 0
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="hidden md:inline">회사 정보</span>
              <span className="md:hidden">회사</span>
            </button>

            {/* 시즌 효과 설정 버튼 */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`px-3 py-2 rounded-lg transition-colors text-xs md:text-sm ${
                effectEnabled && seasonalEffect
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="hidden md:inline">시즌 효과</span>
              <span className="md:hidden">시즌</span>
            </button>

            {/* View Toggle - PC only */}
            {!isMobile && (
              <div className="flex border border-white/20 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-black font-medium'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  그리드
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-black font-medium'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  목록
                </button>
              </div>
            )}

            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/admin/login');
              }}
              className="px-3 py-2 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs md:text-sm"
            >
              로그아웃
            </button>

            <button
              onClick={() => openModal()}
              className="px-3 md:px-4 py-2 bg-white hover:bg-white/90 text-black font-medium rounded-lg transition-colors text-xs md:text-sm"
            >
              + {isMobile ? '추가' : '새 제품'}
            </button>

            <a
              href="/"
              className="px-2 md:px-4 py-2 text-xs md:text-sm text-white/50 hover:text-white transition-colors"
            >
              {isMobile ? '메인' : '메인으로'}
            </a>
          </div>
        </div>
      </header>

      {/* Message Toast */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg border ${
            message.type === 'success'
              ? 'bg-black border-white/20 text-white'
              : 'bg-red-950 border-red-500/50 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {viewMode === 'grid' ? (
          isMobile ? (
            <AdminMobileHexGrid
              products={products}
              onReorder={handleReorder}
              onProductClick={openModal}
            />
          ) : (
            <AdminHexGrid
              products={products}
              onReorder={handleReorder}
              onProductClick={openModal}
            />
          )
        ) : (
          <div className="h-full overflow-auto p-4">
            <div className="max-w-5xl mx-auto">
              {/* Info */}
              <div className="border border-white/10 rounded-lg p-4 mb-4 text-sm text-white/50">
                <span className="text-white font-medium">팁:</span> 행을 드래그하여 순서를 변경할 수 있습니다. 좌측의 ≡ 아이콘을 드래그하세요.
              </div>

              {/* List */}
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-2 py-3 text-center text-sm font-medium text-white/50 w-10"></th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/50 w-16">순서</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/50 w-20">이미지</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/50">제품명</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/50">고객사</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-white/50 w-20">텍스트</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-white/50 w-36 whitespace-nowrap">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {sortedProducts.map((product, index) => {
                      const isDragged = draggedId === product.id;
                      const isDragOver = dragOverId === product.id;

                      return (
                        <tr
                          key={product.id}
                          draggable
                          onDragStart={(e) => handleListDragStart(e, product.id)}
                          onDragOver={(e) => handleListDragOver(e, product.id)}
                          onDragLeave={handleListDragLeave}
                          onDrop={(e) => handleListDrop(e, product.id)}
                          onDragEnd={handleListDragEnd}
                          className={`
                            transition-all duration-200
                            ${isDragged ? 'opacity-50 bg-white/5' : 'hover:bg-white/5'}
                            ${isDragOver ? 'bg-white/10 border-t-2 border-white/50' : ''}
                          `}
                        >
                          {/* 드래그 핸들 */}
                          <td className="px-2 py-3 cursor-grab active:cursor-grabbing">
                            <div className="flex items-center justify-center text-white/30 hover:text-white transition-colors">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                              </svg>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`
                              inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                              ${index === 0 ? 'bg-white text-black' : 'bg-white/10 text-white/70'}
                            `}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-12 h-12 bg-white/10 rounded-full overflow-hidden">
                              <img
                                src={product.images[product.thumbnailIndex] || product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                draggable={false}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = `data:image/svg+xml,${encodeURIComponent(`
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
                                      <rect fill="#1a1a1a" width="48" height="48"/>
                                      <text fill="#666" font-size="8" text-anchor="middle" x="24" y="26">No IMG</text>
                                    </svg>
                                  `)}`;
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium">{product.name}</span>
                          </td>
                          <td className="px-4 py-3 text-white/50">{product.client}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={async () => {
                                const newShowInfo = !product.showInfo;
                                // Optimistic update
                                setProducts(prev => prev.map(p =>
                                  p.id === product.id ? { ...p, showInfo: newShowInfo } : p
                                ));
                                try {
                                  const res = await fetch('/api/products', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ ...product, showInfo: newShowInfo }),
                                  });
                                  if (!res.ok) throw new Error('Failed');
                                } catch {
                                  await loadProducts();
                                  showMessage('error', '변경에 실패했습니다.');
                                }
                              }}
                              className={`
                                relative w-10 h-5 rounded-full transition-colors duration-200
                                ${product.showInfo ? 'bg-white' : 'bg-white/20'}
                              `}
                            >
                              <span
                                className={`
                                  absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200
                                  ${product.showInfo ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white/50'}
                                `}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                              <button
                                onClick={() => openModal(product)}
                                className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="px-2.5 py-1 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {sortedProducts.length === 0 && (
                  <div className="py-12 text-center text-white/30">
                    등록된 제품이 없습니다. 새 제품을 추가해 주세요.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-white/10 rounded-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingProduct ? '제품 수정' : '새 제품 추가'}
              </h3>
              <button
                onClick={closeModal}
                className="text-white/50 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  제품명 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-white/30 text-white placeholder-white/30"
                  placeholder="프리미엄 에코백"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  고객사 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-white/30 text-white placeholder-white/30"
                  placeholder="스타벅스 코리아"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  이미지 *
                </label>

                {/* 이미지 미리보기 */}
                {formData.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.images.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative group w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          formData.thumbnailIndex === idx
                            ? 'border-white'
                            : 'border-white/20'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`이미지 ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          {formData.thumbnailIndex !== idx && (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, thumbnailIndex: idx })}
                              className="p-1.5 bg-white rounded text-black text-xs"
                              title="썸네일로 설정"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = formData.images.filter((_, i) => i !== idx);
                              const newThumbnailIndex = formData.thumbnailIndex >= newImages.length
                                ? Math.max(0, newImages.length - 1)
                                : formData.thumbnailIndex > idx
                                  ? formData.thumbnailIndex - 1
                                  : formData.thumbnailIndex;
                              setFormData({ ...formData, images: newImages, thumbnailIndex: newThumbnailIndex });
                            }}
                            className="p-1.5 bg-red-500 rounded text-white text-xs"
                            title="삭제"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {formData.thumbnailIndex === idx && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-white text-black text-[10px] font-medium rounded">
                            썸네일
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 파일 업로드 버튼 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;

                    setIsUploading(true);
                    const newImages: string[] = [];

                    try {
                      for (const file of Array.from(files)) {
                        const formDataUpload = new FormData();
                        formDataUpload.append('file', file);

                        const res = await fetch('/api/upload', {
                          method: 'POST',
                          body: formDataUpload,
                        });

                        if (!res.ok) throw new Error('Upload failed');

                        const data = await res.json();
                        newImages.push(data.url);
                      }

                      setFormData(prev => ({
                        ...prev,
                        images: [...prev.images, ...newImages],
                      }));
                      showMessage('success', `${newImages.length}개 이미지 업로드 완료`);
                    } catch (err) {
                      console.error('Upload error:', err);
                      showMessage('error', '이미지 업로드에 실패했습니다.');
                    } finally {
                      setIsUploading(false);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full px-4 py-3 border-2 border-dashed border-white/20 hover:border-white/40 rounded-lg transition-colors text-white/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      업로드 중...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      클릭하여 이미지 선택 (여러 장 가능)
                    </span>
                  )}
                </button>
                <p className="mt-2 text-xs text-white/30">
                  {formData.images.length === 0
                    ? '최소 1개 이상의 이미지를 업로드하세요.'
                    : `${formData.images.length}개 이미지 (첫 번째 이미지 클릭하여 썸네일 지정)`
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-white/30 text-white placeholder-white/30 resize-none"
                  placeholder="제품에 대한 설명을 입력하세요."
                />
              </div>

              {/* 비디오 URL */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  비디오 URL (선택사항)
                </label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-white/30 text-white placeholder-white/30"
                  placeholder="https://www.youtube.com/watch?v=... 또는 비디오 URL"
                />
                <p className="mt-1 text-xs text-white/40">
                  유튜브 링크 또는 직접 비디오 URL을 입력하세요. 상세페이지에서 재생됩니다.
                </p>
              </div>

              {/* 텍스트 표시 토글 */}
              <div className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white/70">텍스트 표시</p>
                  <p className="text-xs text-white/40 mt-0.5">메인 화면에서 제품명과 고객사를 표시합니다</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, showInfo: !formData.showInfo })}
                  className={`
                    relative w-12 h-6 rounded-full transition-colors duration-200
                    ${formData.showInfo ? 'bg-white' : 'bg-white/20'}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 left-1 w-4 h-4 rounded-full transition-transform duration-200
                      ${formData.showInfo ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white/50'}
                    `}
                  />
                </button>
              </div>

              {editingProduct && (
                <div className="pt-2 pb-2 px-3 bg-white/5 rounded-lg">
                  <p className="text-sm text-white/50">
                    현재 순서: <span className="text-white font-bold">#{sortedProducts.findIndex(p => p.id === editingProduct.id) + 1}</span>
                    <span className="text-white/30 ml-2">(그리드 뷰에서 드래그하여 변경)</span>
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingProduct.id)}
                    className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    삭제
                  </button>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-white hover:bg-white/90 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-white/10 rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold">시즌 효과 설정</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 효과 활성화 토글 */}
              <div className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white/70">효과 활성화</p>
                  <p className="text-xs text-white/40 mt-0.5">메인페이지에 시즌 효과를 표시합니다</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEffectEnabled(!effectEnabled)}
                  className={`
                    relative w-12 h-6 rounded-full transition-colors duration-200
                    ${effectEnabled ? 'bg-white' : 'bg-white/20'}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 left-1 w-4 h-4 rounded-full transition-transform duration-200
                      ${effectEnabled ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white/50'}
                    `}
                  />
                </button>
              </div>

              {/* 효과 선택 */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  효과 종류
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {EFFECT_OPTIONS.map((option) => (
                    <button
                      key={option.value ?? 'none'}
                      onClick={() => setSeasonalEffect(option.value)}
                      className={`
                        px-4 py-3 rounded-lg border transition-all text-left flex items-center gap-3
                        ${seasonalEffect === option.value
                          ? 'border-white bg-white/10 text-white'
                          : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                        }
                      `}
                    >
                      <span className="text-2xl">{option.icon}</span>
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 미리보기 안내 */}
              {effectEnabled && seasonalEffect && (
                <div className="py-3 px-4 bg-white/5 rounded-lg text-center">
                  <p className="text-sm text-white/50">
                    저장 후 메인페이지에서 <span className="text-white font-medium">{EFFECT_OPTIONS.find(o => o.value === seasonalEffect)?.label}</span> 효과를 확인할 수 있습니다.
                  </p>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={saveSettings}
                  disabled={isSavingSettings}
                  className="flex-1 px-6 py-2 bg-white hover:bg-white/90 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSavingSettings ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Settings Modal */}
      {isCompanySettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold">회사 정보 설정</h3>
              <button
                onClick={() => setIsCompanySettingsOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* 이미지 업로드 */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  회사 소개 이미지
                </label>

                {/* 이미지 미리보기 */}
                {companyImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {companyImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative group w-20 h-20 rounded-lg overflow-hidden border-2 border-white/20"
                      >
                        <img
                          src={img}
                          alt={`회사 이미지 ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setCompanyImages(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 bg-red-500 rounded text-white text-xs"
                            title="삭제"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 파일 업로드 버튼 */}
                <input
                  ref={companyFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;

                    setIsUploadingCompanyImage(true);
                    const newImages: string[] = [];

                    try {
                      for (const file of Array.from(files)) {
                        const formDataUpload = new FormData();
                        formDataUpload.append('file', file);

                        const res = await fetch('/api/upload', {
                          method: 'POST',
                          body: formDataUpload,
                        });

                        if (!res.ok) throw new Error('Upload failed');

                        const data = await res.json();
                        newImages.push(data.url);
                      }

                      setCompanyImages(prev => [...prev, ...newImages]);
                      showMessage('success', `${newImages.length}개 이미지 업로드 완료`);
                    } catch (err) {
                      console.error('Upload error:', err);
                      showMessage('error', '이미지 업로드에 실패했습니다.');
                    } finally {
                      setIsUploadingCompanyImage(false);
                      if (companyFileInputRef.current) {
                        companyFileInputRef.current.value = '';
                      }
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => companyFileInputRef.current?.click()}
                  disabled={isUploadingCompanyImage}
                  className="w-full px-4 py-3 border-2 border-dashed border-white/20 hover:border-white/40 rounded-lg transition-colors text-white/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingCompanyImage ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      업로드 중...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      클릭하여 이미지 선택 (여러 장 가능)
                    </span>
                  )}
                </button>
                <p className="mt-2 text-xs text-white/30">
                  THEXEN 로고 클릭 시 표시될 회사 소개 이미지들입니다.
                </p>
              </div>

              {/* 회사 설명 */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  회사 설명 (선택사항)
                </label>
                <textarea
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-white/30 text-white placeholder-white/30 resize-none"
                  placeholder="회사에 대한 간단한 설명을 입력하세요."
                />
              </div>

              {/* 미리보기 안내 */}
              {companyImages.length > 0 && (
                <div className="py-3 px-4 bg-white/5 rounded-lg text-center">
                  <p className="text-sm text-white/50">
                    메인페이지에서 <span className="text-white font-medium">THEXEN</span> 로고를 클릭하면 회사 정보가 표시됩니다.
                  </p>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompanySettingsOpen(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={saveCompanySettings}
                  disabled={isSavingCompanySettings}
                  className="flex-1 px-6 py-2 bg-white hover:bg-white/90 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSavingCompanySettings ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Landing Settings Modal */}
      {isLandingSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold">랜딩페이지 설정</h3>
              <button
                onClick={() => setIsLandingSettingsOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* 로고 이미지 업로드 */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  로고 이미지 (SVG 권장)
                </label>

                {/* 로고 미리보기 */}
                {landingLogoImage && (
                  <div className="mb-3 p-4 bg-black rounded-lg border border-white/10">
                    <div className="flex items-center justify-center">
                      <img
                        src={landingLogoImage}
                        alt="로고 미리보기"
                        className="max-h-24 object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLandingLogoImage(null)}
                      className="mt-3 w-full px-3 py-1.5 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    >
                      로고 제거
                    </button>
                  </div>
                )}

                {/* 파일 업로드 버튼 */}
                <input
                  ref={landingLogoInputRef}
                  type="file"
                  accept="image/*,.svg"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setIsUploadingLandingLogo(true);
                    try {
                      const formDataUpload = new FormData();
                      formDataUpload.append('file', file);

                      const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formDataUpload,
                      });

                      if (!res.ok) throw new Error('Upload failed');

                      const data = await res.json();
                      setLandingLogoImage(data.url);
                      showMessage('success', '로고 이미지 업로드 완료');
                    } catch (err) {
                      console.error('Upload error:', err);
                      showMessage('error', '이미지 업로드에 실패했습니다.');
                    } finally {
                      setIsUploadingLandingLogo(false);
                      if (landingLogoInputRef.current) {
                        landingLogoInputRef.current.value = '';
                      }
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => landingLogoInputRef.current?.click()}
                  disabled={isUploadingLandingLogo}
                  className="w-full px-4 py-3 border-2 border-dashed border-white/20 hover:border-white/40 rounded-lg transition-colors text-white/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingLandingLogo ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      업로드 중...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {landingLogoImage ? '로고 이미지 변경' : '로고 이미지 업로드'}
                    </span>
                  )}
                </button>
                <p className="mt-2 text-xs text-white/30">
                  SVG 형식을 권장합니다. 로고가 없으면 기본 &quot;THEXEN&quot; 텍스트가 표시됩니다.
                </p>
              </div>

              {/* 배경 이미지 업로드 */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  배경 이미지
                </label>

                {/* 배경 타입 선택 */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setLandingBackgroundType('tile')}
                    className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm ${
                      landingBackgroundType === 'tile'
                        ? 'border-white bg-white/10 text-white'
                        : 'border-white/20 text-white/50 hover:border-white/40'
                    }`}
                  >
                    패턴 반복 (타일)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLandingBackgroundType('cover')}
                    className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm ${
                      landingBackgroundType === 'cover'
                        ? 'border-white bg-white/10 text-white'
                        : 'border-white/20 text-white/50 hover:border-white/40'
                    }`}
                  >
                    전체 화면 (커버)
                  </button>
                </div>

                {/* 배경 미리보기 */}
                {landingBackgroundImage && (
                  <div className="mb-3">
                    <div
                      className="h-32 rounded-lg border border-white/10 overflow-hidden"
                      style={landingBackgroundType === 'tile' ? {
                        backgroundImage: `url(${landingBackgroundImage})`,
                        backgroundRepeat: 'repeat',
                        backgroundSize: '100px 100px',
                      } : {
                        backgroundImage: `url(${landingBackgroundImage})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    {landingBackgroundType === 'tile' && (
                      <div className="mt-2 flex gap-2">
                        <div className="flex-1 p-2 bg-white/5 rounded text-center">
                          <img
                            src={landingBackgroundImage}
                            alt="원본 타일"
                            className="w-12 h-12 object-cover mx-auto border border-white/20"
                          />
                          <p className="text-xs text-white/40 mt-1">원본 타일</p>
                        </div>
                        <div className="flex-1 p-2 bg-white/5 rounded text-center flex items-center justify-center">
                          <p className="text-xs text-white/40">100x100px로 타일링됩니다</p>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setLandingBackgroundImage(null)}
                      className="mt-3 w-full px-3 py-1.5 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    >
                      배경 제거
                    </button>
                  </div>
                )}

                {/* 파일 업로드 버튼 */}
                <input
                  ref={landingBgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setIsUploadingLandingBg(true);
                    try {
                      const formDataUpload = new FormData();
                      formDataUpload.append('file', file);

                      const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formDataUpload,
                      });

                      if (!res.ok) throw new Error('Upload failed');

                      const data = await res.json();
                      setLandingBackgroundImage(data.url);
                      showMessage('success', '배경 이미지 업로드 완료');
                    } catch (err) {
                      console.error('Upload error:', err);
                      showMessage('error', '이미지 업로드에 실패했습니다.');
                    } finally {
                      setIsUploadingLandingBg(false);
                      if (landingBgInputRef.current) {
                        landingBgInputRef.current.value = '';
                      }
                    }
                  }}
                  className="absolute opacity-0 w-0 h-0"
                  style={{ pointerEvents: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => landingBgInputRef.current?.click()}
                  disabled={isUploadingLandingBg}
                  className="w-full px-4 py-3 border-2 border-dashed border-white/20 hover:border-white/40 rounded-lg transition-colors text-white/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingLandingBg ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      업로드 중...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {landingBackgroundImage ? '배경 이미지 변경' : '배경 이미지 업로드'}
                    </span>
                  )}
                </button>
                <p className="mt-2 text-xs text-white/30">
                  {landingBackgroundType === 'tile'
                    ? '100x100 픽셀 크기의 이미지를 권장합니다. 전체 화면에 반복 타일링됩니다.'
                    : '전체 화면에 맞게 이미지가 표시됩니다. 고해상도 이미지를 권장합니다.'}
                </p>
              </div>

              {/* 엔터 버튼 이미지 업로드 */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  엔터 버튼 이미지
                </label>

                {/* 미리보기 */}
                {landingEnterImage && (
                  <div className="mb-3">
                    <div className="flex items-center justify-center p-4 bg-black/50 rounded-lg border border-white/10">
                      <img
                        src={landingEnterImage}
                        alt="엔터 버튼"
                        className="w-16 h-16 object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLandingEnterImage(null)}
                      className="mt-3 w-full px-3 py-1.5 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    >
                      엔터 버튼 이미지 제거
                    </button>
                  </div>
                )}

                {/* 파일 업로드 버튼 */}
                <input
                  ref={landingEnterInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setIsUploadingLandingEnter(true);
                    try {
                      const formDataUpload = new FormData();
                      formDataUpload.append('file', file);

                      const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formDataUpload,
                      });

                      if (!res.ok) throw new Error('Upload failed');

                      const data = await res.json();
                      setLandingEnterImage(data.url);
                      showMessage('success', '엔터 버튼 이미지 업로드 완료');
                    } catch (err) {
                      console.error('Upload error:', err);
                      showMessage('error', '이미지 업로드에 실패했습니다.');
                    } finally {
                      setIsUploadingLandingEnter(false);
                      if (landingEnterInputRef.current) {
                        landingEnterInputRef.current.value = '';
                      }
                    }
                  }}
                  className="absolute opacity-0 w-0 h-0"
                  style={{ pointerEvents: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => landingEnterInputRef.current?.click()}
                  disabled={isUploadingLandingEnter}
                  className="w-full px-4 py-3 border-2 border-dashed border-white/20 hover:border-white/40 rounded-lg transition-colors text-white/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingLandingEnter ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      업로드 중...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {landingEnterImage ? '엔터 버튼 이미지 변경' : '엔터 버튼 이미지 업로드'}
                    </span>
                  )}
                </button>
                <p className="mt-2 text-xs text-white/30">
                  원형 이미지를 권장합니다. 업로드하지 않으면 기본 화살표 아이콘이 표시됩니다.
                </p>
              </div>

              {/* 그리드 배경색 */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  포트폴리오 배경색
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={gridBackgroundColor}
                    onChange={(e) => setGridBackgroundColor(e.target.value)}
                    className="w-12 h-12 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={gridBackgroundColor}
                    onChange={(e) => setGridBackgroundColor(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-white/30 text-white placeholder-white/30 font-mono"
                    placeholder="#000000"
                  />
                  <button
                    type="button"
                    onClick={() => setGridBackgroundColor('#000000')}
                    className="px-3 py-2 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white/50"
                  >
                    초기화
                  </button>
                </div>
                <p className="mt-2 text-xs text-white/30">
                  포트폴리오 그리드 화면의 배경색을 설정합니다.
                </p>
              </div>

              {/* 헤더 로고 이미지 */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  포트폴리오 헤더 로고
                </label>

                {headerLogoImage && (
                  <div className="mb-3 p-4 bg-black rounded-lg border border-white/10">
                    <div className="flex items-center justify-center">
                      <img
                        src={headerLogoImage}
                        alt="헤더 로고 미리보기"
                        className="max-h-12 object-contain"
                      />
                    </div>
                    <div className="flex justify-center mt-2">
                      <button
                        type="button"
                        onClick={() => setHeaderLogoImage(null)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        로고 삭제 (기본 텍스트로 복원)
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={headerLogoInputRef}
                  type="file"
                  accept="image/*,.svg"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setIsUploadingHeaderLogo(true);
                    try {
                      const formDataUpload = new FormData();
                      formDataUpload.append('file', file);
                      const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        body: formDataUpload,
                      });
                      if (!uploadRes.ok) throw new Error('Upload failed');
                      const uploadData = await uploadRes.json();
                      setHeaderLogoImage(uploadData.url);
                    } catch {
                      showMessage('error', '이미지 업로드에 실패했습니다.');
                    } finally {
                      setIsUploadingHeaderLogo(false);
                      if (headerLogoInputRef.current) {
                        headerLogoInputRef.current.value = '';
                      }
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => headerLogoInputRef.current?.click()}
                  disabled={isUploadingHeaderLogo}
                  className="w-full px-4 py-3 border-2 border-dashed border-white/20 hover:border-white/40 rounded-lg transition-colors text-white/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingHeaderLogo ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      업로드 중...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {headerLogoImage ? '헤더 로고 변경' : '헤더 로고 업로드'}
                    </span>
                  )}
                </button>
                <p className="mt-2 text-xs text-white/30">
                  포트폴리오 헤더의 &quot;THEXEN&quot; 텍스트 대신 표시될 로고 이미지입니다.
                </p>
              </div>

              {/* 외부 링크 버튼 */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  외부 링크 버튼 (최대 3개)
                </label>
                <div className="space-y-3">
                  {externalLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                      {/* Image preview */}
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                        {link.image ? (
                          <img src={link.image} alt={`링크 ${idx + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px]">IMG</div>
                        )}
                      </div>
                      {/* Upload button */}
                      <input
                        ref={(el) => { externalLinkInputRefs.current[idx] = el; }}
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          setIsUploadingExternalLink(idx);
                          try {
                            const formDataUpload = new FormData();
                            formDataUpload.append('file', file);

                            const res = await fetch('/api/upload', {
                              method: 'POST',
                              body: formDataUpload,
                            });

                            if (!res.ok) throw new Error('Upload failed');

                            const data = await res.json();
                            setExternalLinks(prev => {
                              const newLinks = [...prev];
                              newLinks[idx] = { ...newLinks[idx], image: data.url };
                              return newLinks;
                            });
                            showMessage('success', '이미지 업로드 완료');
                          } catch (err) {
                            console.error('Upload error:', err);
                            showMessage('error', '이미지 업로드에 실패했습니다.');
                          } finally {
                            setIsUploadingExternalLink(null);
                            if (externalLinkInputRefs.current[idx]) {
                              externalLinkInputRefs.current[idx]!.value = '';
                            }
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => externalLinkInputRefs.current[idx]?.click()}
                        disabled={isUploadingExternalLink === idx}
                        className="px-2 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors flex-shrink-0 disabled:opacity-50"
                      >
                        {isUploadingExternalLink === idx ? '...' : '이미지'}
                      </button>
                      {/* URL input */}
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...externalLinks];
                          newLinks[idx] = { ...newLinks[idx], url: e.target.value };
                          setExternalLinks(newLinks);
                        }}
                        className="flex-1 min-w-0 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                        placeholder="https://..."
                      />
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => setExternalLinks(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300 flex-shrink-0 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {externalLinks.length < 3 && (
                    <button
                      type="button"
                      onClick={() => setExternalLinks(prev => [...prev, { image: '', url: '' }])}
                      className="w-full px-4 py-2.5 border-2 border-dashed border-white/20 hover:border-white/40 rounded-lg text-white/50 hover:text-white text-sm transition-colors"
                    >
                      + 링크 추가
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-white/30">
                  메인 화면 우측 상단에 이미지 버튼으로 표시됩니다.
                </p>
              </div>

              {/* 패널 위치 조정 */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  패널 위치 조정 (PC)
                </label>
                <p className="text-xs text-white/40 mb-4">
                  왼쪽 로고와 오른쪽 링크 버튼의 위치를 드래그로 조정합니다.
                </p>
                <div className="flex gap-6 justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-white/50">왼쪽 (로고)</span>
                    <PanelPositionDragger2D x={leftPanelPositionX} y={leftPanelPositionY} onChange={(nx, ny) => { setLeftPanelPositionX(nx); setLeftPanelPositionY(ny); }} label="Logo" />
                    <span className="text-xs text-white/30 font-mono">{leftPanelPositionX}, {leftPanelPositionY}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-white/50">오른쪽 (링크)</span>
                    <PanelPositionDragger2D x={rightPanelPositionX} y={rightPanelPositionY} onChange={(nx, ny) => { setRightPanelPositionX(nx); setRightPanelPositionY(ny); }} label="Links" />
                    <span className="text-xs text-white/30 font-mono">{rightPanelPositionX}, {rightPanelPositionY}</span>
                  </div>
                </div>
              </div>

              {/* 미리보기 안내 */}
              {(landingLogoImage || landingBackgroundImage || landingEnterImage) && (
                <div className="py-3 px-4 bg-white/5 rounded-lg text-center">
                  <p className="text-sm text-white/50">
                    저장 후 메인페이지에서 변경된 랜딩페이지를 확인할 수 있습니다.
                  </p>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLandingSettingsOpen(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={saveLandingSettings}
                  disabled={isSavingLandingSettings}
                  className="flex-1 px-6 py-2 bg-white hover:bg-white/90 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSavingLandingSettings ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
