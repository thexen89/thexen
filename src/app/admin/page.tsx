'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/lib/types';
import AdminHexGrid from '@/components/AdminHexGrid';

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [formData, setFormData] = useState({
    name: '',
    client: '',
    image: '',
    description: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

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
        image: product.image,
        description: product.description,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        client: '',
        image: '',
        description: '',
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
      image: '',
      description: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const body = editingProduct
        ? { ...formData, id: editingProduct.id, priority: editingProduct.priority }
        : { ...formData, priority: products.length + 1 };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sortedProducts = [...products].sort((a, b) => a.priority - b.priority);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="max-w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-xl font-bold">
              THE<span className="text-cyan-400">X</span>EN
            </a>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">관리자</span>
            <span className="text-gray-600 text-sm">({products.length}개)</span>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-cyan-500 text-black font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                그리드
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-cyan-500 text-black font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                목록
              </button>
            </div>

            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-medium rounded-lg transition-colors text-sm"
            >
              + 새 제품
            </button>

            <a
              href="/"
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              메인으로
            </a>
          </div>
        </div>
      </header>

      {/* Message Toast */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {viewMode === 'grid' ? (
          <AdminHexGrid
            products={products}
            onReorder={handleReorder}
            onProductClick={openModal}
          />
        ) : (
          <div className="h-full overflow-auto p-4">
            <div className="max-w-5xl mx-auto">
              {/* Info */}
              <div className="bg-gray-800 rounded-lg p-4 mb-4 text-sm text-gray-400">
                <span className="text-cyan-400 font-medium">팁:</span> 그리드 뷰에서 원을 드래그하여 순서를 변경할 수 있습니다.
              </div>

              {/* List */}
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-16">순서</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-20">이미지</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">제품명</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">고객사</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">등록일</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 w-32">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {sortedProducts.map((product, index) => (
                      <tr key={product.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <span className={`
                            inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                            ${index === 0 ? 'bg-cyan-500 text-black' : 'bg-gray-700 text-gray-300'}
                          `}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-12 h-12 bg-gray-700 rounded-full overflow-hidden">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `data:image/svg+xml,${encodeURIComponent(`
                                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
                                    <rect fill="#374151" width="48" height="48"/>
                                    <text fill="#6b7280" font-size="8" text-anchor="middle" x="24" y="26">No IMG</text>
                                  </svg>
                                `)}`;
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{product.name}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">{product.client}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{product.createdAt}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openModal(product)}
                              className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="px-3 py-1 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {sortedProducts.length === 0 && (
                  <div className="py-12 text-center text-gray-500">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingProduct ? '제품 수정' : '새 제품 추가'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  제품명 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-cyan-500"
                  placeholder="프리미엄 에코백"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  고객사 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-cyan-500"
                  placeholder="스타벅스 코리아"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  이미지 경로 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-cyan-500"
                  placeholder="/samples/product1.jpg"
                />
                <p className="mt-1 text-xs text-gray-500">
                  이미지는 public/samples 폴더에 업로드 후 경로를 입력하세요.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-cyan-500 resize-none"
                  placeholder="제품에 대한 설명을 입력하세요."
                />
              </div>

              {editingProduct && (
                <div className="pt-2 pb-2 px-3 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">
                    현재 순서: <span className="text-cyan-400 font-bold">#{sortedProducts.findIndex(p => p.id === editingProduct.id) + 1}</span>
                    <span className="text-gray-500 ml-2">(그리드 뷰에서 드래그하여 변경)</span>
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingProduct.id)}
                    className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg transition-colors"
                  >
                    삭제
                  </button>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
