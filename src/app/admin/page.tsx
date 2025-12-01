'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/lib/types';

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    client: '',
    image: '',
    description: '',
    priority: 1,
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
        priority: product.priority,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        client: '',
        image: '',
        description: '',
        priority: products.length + 1,
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
      priority: 1,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const body = editingProduct
        ? { ...formData, id: editingProduct.id }
        : formData;

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
      showMessage('success', '제품이 삭제되었습니다.');
    } catch (err) {
      console.error('Failed to delete product:', err);
      showMessage('error', '삭제에 실패했습니다.');
    }
  };

  const handlePriorityChange = async (product: Product, newPriority: number) => {
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...product, priority: newPriority }),
      });

      if (!res.ok) throw new Error('Failed to update priority');

      await loadProducts();
      showMessage('success', '우선순위가 변경되었습니다.');
    } catch (err) {
      console.error('Failed to update priority:', err);
      showMessage('error', '우선순위 변경에 실패했습니다.');
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-xl font-bold">
              THE<span className="text-cyan-400">X</span>EN
            </a>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">관리자 페이지</span>
          </div>
          <a
            href="/"
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            메인으로
          </a>
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
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Info Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">사용 안내</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-cyan-500 text-black rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <p><strong className="text-white">우선순위 번호</strong>가 낮을수록 화면 중앙에 배치됩니다. (1번 = 정중앙)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-cyan-500 text-black rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <p>2~7번은 중앙을 감싸는 첫 번째 링, 8번 이후는 바깥쪽으로 배치됩니다.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-cyan-500 text-black rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <p><strong className="text-white">이미지 경로</strong>는 /samples/파일명.jpg 형식으로 입력하세요.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-cyan-500 text-black rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              <p>이미지 파일은 public/samples 폴더에 업로드 해주세요.</p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">포트폴리오 관리</h1>
          <button
            onClick={() => openModal()}
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-medium rounded-lg transition-colors"
          >
            + 새 제품 추가
          </button>
        </div>

        {/* Products Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-20">우선순위</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-20">이미지</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">제품명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">고객사</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">등록일</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 w-32">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sortedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="1"
                      value={product.priority}
                      onChange={(e) => handlePriorityChange(product, parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-center text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 bg-gray-700 rounded overflow-hidden">
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

        <div className="mt-4 text-sm text-gray-500">
          총 {products.length}개의 제품
        </div>
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  우선순위 (1 = 중앙)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  숫자가 낮을수록 화면 중앙에 배치됩니다.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
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
