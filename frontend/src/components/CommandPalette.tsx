import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Search, Command, ArrowRight, User, Package, FileText, Activity } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'customer' | 'product' | 'challan';
  title: string;
  subtitle: string;
  url: string;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search effect
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }

    const searchData = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await api.get(`/dashboard/search?q=${encodeURIComponent(query)}`);
        const data = res.data.data;
        
        const formattedResults: SearchResult[] = [
          ...data.customers.map((c: any) => ({
            id: c.id, type: 'customer', title: c.company || c.name, subtitle: c.name || c.type, url: '/customers'
          })),
          ...data.products.map((p: any) => ({
            id: p.id, type: 'product', title: p.name, subtitle: `${p.sku} • ₹${p.price}`, url: '/products'
          })),
          ...data.challans.map((ch: any) => ({
            id: ch.id, type: 'challan', title: ch.challan_number, subtitle: ch.customer_name, url: '/challans'
          }))
        ];
        
        setResults(formattedResults);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [query, isOpen]);

  // Navigate results
  useEffect(() => {
    const handleNavigation = (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [isOpen, results, selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'customer': return <User size={16} className="text-indigo-400" />;
      case 'product': return <Package size={16} className="text-emerald-400" />;
      case 'challan': return <FileText size={16} className="text-cyan-400" />;
      default: return <Activity size={16} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh]" onClick={() => setIsOpen(false)}>
      <div 
        className="w-full max-w-xl bg-surface-glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-white/10 bg-black/40">
          <Search size={20} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none text-white px-4 py-4 outline-none placeholder:text-gray-500"
            placeholder="Search assets, clients, orders..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium tracking-wider bg-white/5 px-2 py-1 rounded">
            ESC TO CANCEL
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Results</div>
              {results.map((result, idx) => (
                <div
                  key={result.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    idx === selectedIndex ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'
                  }`}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className={`p-2 rounded-md bg-white/5 ${idx === selectedIndex ? 'shadow-[0_0_10px_rgba(255,255,255,0.1)]' : ''}`}>
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{result.title}</div>
                    <div className="text-xs text-gray-500 truncate">{result.subtitle}</div>
                  </div>
                  {idx === selectedIndex && <ArrowRight size={16} className="text-gray-400" />}
                </div>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No results found for "<span className="text-gray-300">{query}</span>"
            </div>
          ) : (
            <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500">
              <Command size={40} className="mb-3 opacity-20" />
              <p className="text-sm">Start typing to search across the entire database.</p>
              <div className="flex gap-4 mt-6 text-xs">
                <span className="bg-white/5 px-2 py-1 rounded border border-white/5 text-gray-400">Search "JBL"</span>
                <span className="bg-white/5 px-2 py-1 rounded border border-white/5 text-gray-400">Search "SC-"</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
