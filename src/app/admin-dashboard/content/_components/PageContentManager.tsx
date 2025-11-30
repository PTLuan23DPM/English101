"use client";

import { useState, useEffect } from "react";
import PageContentForm from "./PageContentForm";

interface PageContent {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

const DEFAULT_PAGES = [
  { slug: "about", title: "Giới Thiệu", content: "" },
  { slug: "contact", title: "Liên Hệ", content: "" },
  { slug: "faq", title: "Câu Hỏi Thường Gặp", content: "" },
];

export default function PageContentManager() {
  const [pages, setPages] = useState<PageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<PageContent | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin-dashboard/page-content");
      if (!response.ok) {
        throw new Error("Failed to fetch pages");
      }
      const data = await response.json();
      if (data.success) {
        setPages(data.pages);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching pages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (page: PageContent) => {
    setEditingPage(page);
    setShowForm(true);
  };

  const handleCreate = (slug: string) => {
    const defaultPage = DEFAULT_PAGES.find((p) => p.slug === slug);
    if (defaultPage) {
      setEditingPage({
        id: "",
        slug: defaultPage.slug,
        title: defaultPage.title,
        content: defaultPage.content,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: null,
      });
      setShowForm(true);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPage(null);
    fetchPages();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPageBySlug = (slug: string) => {
    return pages.find((p) => p.slug === slug);
  };

  return (
    <div className="page-content-manager">
      {loading ? (
        <div className="manager-loading">
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <div className="manager-error">
          <p>Lỗi: {error}</p>
          <button onClick={fetchPages} className="retry-button">
            Thử lại
          </button>
        </div>
      ) : (
        <div className="pages-grid">
          {DEFAULT_PAGES.map((defaultPage) => {
            const existingPage = getPageBySlug(defaultPage.slug);
            return (
              <div key={defaultPage.slug} className="page-card">
                <div className="page-card-header">
                  <h3 className="page-card-title">{defaultPage.title}</h3>
                  {existingPage && (
                    <span
                      className={`badge ${
                        existingPage.isPublished ? "badge--published" : "badge--draft"
                      }`}
                    >
                      {existingPage.isPublished ? "Đã xuất bản" : "Bản nháp"}
                    </span>
                  )}
                </div>
                <div className="page-card-content">
                  {existingPage ? (
                    <>
                      <p className="page-card-meta">
                        Cập nhật: {formatDate(existingPage.updatedAt)}
                      </p>
                      <div
                        className="page-card-preview"
                        dangerouslySetInnerHTML={{
                          __html:
                            existingPage.content.length > 100
                              ? existingPage.content.substring(0, 100) + "..."
                              : existingPage.content || "Chưa có nội dung",
                        }}
                      />
                    </>
                  ) : (
                    <p className="page-card-empty">Chưa có nội dung</p>
                  )}
                </div>
                <div className="page-card-actions">
                  {existingPage ? (
                    <button
                      onClick={() => handleEdit(existingPage)}
                      className="btn btn-primary"
                    >
                      Chỉnh sửa
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCreate(defaultPage.slug)}
                      className="btn btn-primary"
                    >
                      Tạo nội dung
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && editingPage && (
        <PageContentForm
          page={editingPage}
          onClose={() => {
            setShowForm(false);
            setEditingPage(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

