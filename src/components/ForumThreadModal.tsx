import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  FormEvent,
} from 'react';
import { useToast } from '../contexts/ToastContext';
import * as forumService from '../services/forumService';

interface ForumThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { categorySlug: string; title: string; content: string }) => Promise<void>;
  defaultCategory?: string;
}

interface ForumCategoryOption {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface ValidationErrors {
  categorySlug?: string;
  title?: string;
  content?: string;
}

const TITLE_MIN_LENGTH = 10;
const TITLE_MAX_LENGTH = 200;
const CONTENT_MIN_LENGTH = 20;
const CONTENT_MAX_LENGTH = 10000;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const convertMarkdownToHtml = (value: string): string => {
  if (!value.trim()) {
    return '<p class="text-gray-400">Nothing to preview yet.</p>';
  }

  let html = escapeHtml(value);

  html = html.replace(/^###### (.*)$/gm, '<h6 class="text-base font-semibold text-white mt-4 mb-2">$1</h6>');
  html = html.replace(/^##### (.*)$/gm, '<h5 class="text-lg font-semibold text-white mt-4 mb-2">$1</h5>');
  html = html.replace(/^#### (.*)$/gm, '<h4 class="text-xl font-semibold text-white mt-4 mb-2">$1</h4>');
  html = html.replace(/^### (.*)$/gm, '<h3 class="text-2xl font-semibold text-white mt-5 mb-3">$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2 class="text-3xl font-bold text-white mt-6 mb-4">$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1 class="text-4xl font-bold text-white mt-8 mb-4">$1</h1>');

  html = html.replace(/^> (.*)$/gm, '<blockquote class="border-l-4 border-brand-primary/70 pl-4 ml-1 italic text-gray-200">$1</blockquote>');

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-800 text-amber-300 px-1.5 py-0.5 rounded-sm text-sm">$1</code>');
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a class="text-brand-secondary hover:text-brand-primary transition-colors" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/g, '<ul class="list-disc list-inside space-y-1">$1</ul>');

  html = html.replace(/(?:\r?\n){3,}/g, '</p><p class="mt-4">');
  html = html.replace(/(?:\r?\n){2}/g, '</p><p class="mt-4">');
  html = html.replace(/\r?\n/g, '<br />');
  html = `<p class="leading-relaxed text-gray-200">${html}</p>`;

  return html;
};

const ForumThreadModal: React.FC<ForumThreadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultCategory,
}) => {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<ForumCategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory || '');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const formattedPreview = useMemo(() => convertMarkdownToHtml(content), [content]);

  const resetState = useCallback(() => {
    setTitle('');
    setContent('');
    setValidationErrors({});
    setSubmitError('');
    setShowPreview(false);
    setSelectedCategory(defaultCategory || '');
  }, [defaultCategory]);

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const response = await forumService.getCategories();
      setCategories(response || []);
    } catch (error) {
      console.error('Failed to load forum categories', error);
      addToast('Unable to load forum categories. Please try again.', 'error');
    } finally {
      setIsLoadingCategories(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    fetchCategories().then(() => {
      if (!isMounted) return;
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 120);
    });

    return () => {
      isMounted = false;
    };
  }, [fetchCategories, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    resetState();
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen || !categories.length) return;

    if (defaultCategory && categories.some(cat => cat.slug === defaultCategory)) {
      setSelectedCategory(defaultCategory);
    } else if (!selectedCategory) {
      setSelectedCategory(categories[0]?.slug || '');
    }
  }, [categories, defaultCategory, isOpen, selectedCategory]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  const applyFormatting = (action: 'bold' | 'italic' | 'code' | 'quote' | 'link' | 'ul') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.focus();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const wrap = (prefix: string, suffix: string = prefix) => {
      const before = content.substring(0, start);
      const after = content.substring(end);
      const newText = `${before}${prefix}${selectedText || 'Your text here'}${suffix}${after}`;
      setContent(newText);

      const caretPosition = start + prefix.length + (selectedText || 'Your text here').length;
      setTimeout(() => textarea.setSelectionRange(caretPosition, caretPosition), 0);
    };

    switch (action) {
      case 'bold':
        wrap('**');
        break;
      case 'italic':
        wrap('*');
        break;
      case 'code':
        wrap('`', '`');
        break;
      case 'quote': {
        const lines = selectedText ? selectedText.split('\n') : ['Your quote here'];
        const quoted = lines.map(line => `> ${line || ''}`).join('\n');
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newText = `${before}${quoted}${after}`;
        setContent(newText);
        const caretPosition = before.length + quoted.length;
        setTimeout(() => textarea.setSelectionRange(caretPosition, caretPosition), 0);
        break;
      }
      case 'link': {
        const url = window.prompt('Enter the URL for the link:', 'https://');
        if (!url) return;
        const linkText = selectedText || 'Link text';
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newText = `${before}[${linkText}](${url})${after}`;
        setContent(newText);
        const caretPosition = before.length + linkText.length + url.length + 4;
        setTimeout(() => textarea.setSelectionRange(caretPosition, caretPosition), 0);
        break;
      }
      case 'ul': {
        const lines = selectedText ? selectedText.split('\n') : ['List item'];
        const bulleted = lines.map(line => (line.startsWith('- ') ? line : `- ${line || 'List item'}`)).join('\n');
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newText = `${before}${bulleted}${after}`;
        setContent(newText);
        const caretPosition = before.length + bulleted.length;
        setTimeout(() => textarea.setSelectionRange(caretPosition, caretPosition), 0);
        break;
      }
      default:
        break;
    }
  };

  const validateForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!selectedCategory) {
      errors.categorySlug = 'Please select a category.';
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      errors.title = 'Thread title is required.';
    } else if (trimmedTitle.length < TITLE_MIN_LENGTH) {
      errors.title = `Title must be at least ${TITLE_MIN_LENGTH} characters.`;
    } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
      errors.title = `Title cannot exceed ${TITLE_MAX_LENGTH} characters.`;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      errors.content = 'Thread content is required.';
    } else if (trimmedContent.length < CONTENT_MIN_LENGTH) {
      errors.content = `Content must be at least ${CONTENT_MIN_LENGTH} characters.`;
    } else if (trimmedContent.length > CONTENT_MAX_LENGTH) {
      errors.content = `Content cannot exceed ${CONTENT_MAX_LENGTH.toLocaleString()} characters.`;
    }

    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        categorySlug: selectedCategory,
        title: title.trim(),
        content: content.trim(),
      });
      addToast('Thread created successfully!', 'success');
      resetState();
      onClose();
    } catch (error) {
      console.error('Failed to create thread', error);
      const message =
        (error as { message?: string })?.message ||
        'Something went wrong while creating the thread. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in-up"
      style={{ animationDuration: '0.25s' }}
      onMouseDown={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="forum-thread-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl mx-4 bg-gray-900 text-white rounded-2xl shadow-2xl border border-gray-800/80 overflow-hidden"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-800/80 px-6 py-5 bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800">
          <div>
            <h2 id="forum-thread-modal-title" className="text-2xl font-bold">
              Start a New Discussion
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Share your ideas, ask questions, or showcase something amazing with the community.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col">
              <label htmlFor="thread-category" className="text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <div className="relative">
                <select
                  id="thread-category"
                  className={`w-full appearance-none rounded-lg border bg-gray-900/60 px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                    validationErrors.categorySlug ? 'border-red-500/70' : 'border-gray-800'
                  }`}
                  value={selectedCategory}
                  onChange={event => setSelectedCategory(event.target.value)}
                  disabled={isLoadingCategories || isSubmitting}
                >
                  <option value="" disabled>
                    {isLoadingCategories ? 'Loading categories...' : 'Select a category'}
                  </option>
                  {categories.map(category => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 14l-5-5h10l-5 5z" />
                  </svg>
                </span>
              </div>
              {validationErrors.categorySlug && (
                <p className="mt-2 text-xs text-red-400">{validationErrors.categorySlug}</p>
              )}
            </div>

            <div className="flex flex-col">
              <label htmlFor="thread-title" className="text-sm font-medium text-gray-300 mb-2">
                Thread Title
              </label>
              <input
                ref={titleInputRef}
                id="thread-title"
                type="text"
                maxLength={TITLE_MAX_LENGTH}
                className={`w-full rounded-lg border bg-gray-900/60 px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                  validationErrors.title ? 'border-red-500/70' : 'border-gray-800'
                }`}
                placeholder="Give your discussion an engaging title..."
                value={title}
                onChange={event => setTitle(event.target.value)}
                disabled={isSubmitting}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>{TITLE_MIN_LENGTH} - {TITLE_MAX_LENGTH} characters</span>
                <span className={title.length > TITLE_MAX_LENGTH ? 'text-red-400' : ''}>
                  {title.length}/{TITLE_MAX_LENGTH}
                </span>
              </div>
              {validationErrors.title && (
                <p className="mt-2 text-xs text-red-400">{validationErrors.title}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <label htmlFor="thread-content" className="text-sm font-medium text-gray-300">
                Content
              </label>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <button
                  type="button"
                  onClick={() => applyFormatting('bold')}
                  className="inline-flex items-center rounded-md border border-gray-800 bg-gray-900/70 px-3 py-1.5 hover:border-gray-600 hover:text-white transition-colors"
                  title="Bold"
                >
                  <span className="font-semibold">B</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('italic')}
                  className="inline-flex items-center rounded-md border border-gray-800 bg-gray-900/70 px-3 py-1.5 italic hover:border-gray-600 hover:text-white transition-colors"
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('code')}
                  className="inline-flex items-center rounded-md border border-gray-800 bg-gray-900/70 px-3 py-1.5 font-mono text-xs hover:border-gray-600 hover:text-white transition-colors"
                  title="Inline code"
                >
                  {'</>'}
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('quote')}
                  className="inline-flex items-center rounded-md border border-gray-800 bg-gray-900/70 px-3 py-1.5 hover:border-gray-600 hover:text-white transition-colors"
                  title="Quote"
                >
                  <span className="text-lg leading-none">❝</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('ul')}
                  className="inline-flex items-center rounded-md border border-gray-800 bg-gray-900/70 px-3 py-1.5 hover:border-gray-600 hover:text-white transition-colors"
                  title="Bulleted list"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h13M6 12h13M6 18h13M4 6h.01M4 12h.01M4 18h.01" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('link')}
                  className="inline-flex items-center rounded-md border border-gray-800 bg-gray-900/70 px-3 py-1.5 hover:border-gray-600 hover:text-white transition-colors"
                  title="Insert link"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h3a4 4 0 110 8h-3m-2 0H8a4 4 0 110-8h3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(prev => !prev)}
                  className={`inline-flex items-center rounded-md border px-3 py-1.5 transition-colors ${
                    showPreview
                      ? 'border-brand-primary text-brand-primary bg-brand-primary/10'
                      : 'border-gray-800 bg-gray-900/70 hover:border-gray-600'
                  }`}
                  title="Toggle preview"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553 2.276A1 1 0 0120 13.185v3.63a1 1 0 01-1.447.908L15 15M4 6h8m-8 6h8m-8 6h8" />
                  </svg>
                  {showPreview ? 'Hide Preview' : 'Preview'}
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <textarea
                  ref={textareaRef}
                  id="thread-content"
                  rows={showPreview ? 14 : 18}
                  maxLength={CONTENT_MAX_LENGTH}
                  className={`w-full rounded-lg border bg-gray-900/60 px-4 py-3 text-sm leading-relaxed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent ${
                    validationErrors.content ? 'border-red-500/70' : 'border-gray-800'
                  }`}
                  placeholder="Share all the details, context, and any helpful links or resources..."
                  value={content}
                  onChange={event => setContent(event.target.value)}
                  disabled={isSubmitting}
                />
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Markdown supported • Minimum {CONTENT_MIN_LENGTH} characters</span>
                  <span className={content.length > CONTENT_MAX_LENGTH ? 'text-red-400' : ''}>
                    {content.length}/{CONTENT_MAX_LENGTH.toLocaleString()}
                  </span>
                </div>
                {validationErrors.content && (
                  <p className="mt-2 text-xs text-red-400">{validationErrors.content}</p>
                )}
              </div>

              {showPreview && (
                <div className="rounded-lg border border-brand-primary/20 bg-gray-900/40 px-4 py-4 text-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-brand-primary">Live Preview</span>
                    <span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span>
                  </div>
                  <div
                    className="max-h-[420px] overflow-y-auto pr-2 text-sm leading-6 space-y-3"
                    dangerouslySetInnerHTML={{ __html: formattedPreview }}
                  />
                </div>
              )}
            </div>
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {submitError}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="relative inline-flex items-center justify-center rounded-lg bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/40 transition-opacity hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-brand-primary/60"
              disabled={isSubmitting || isLoadingCategories}
            >
              {isSubmitting ? (
                <>
                  <span className="absolute inset-y-0 left-4 flex items-center">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  </span>
                  <span className="pl-5">Publishing...</span>
                </>
              ) : (
                'Publish Thread'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForumThreadModal;