import { useState, useEffect } from "react";
import {
  ShoppingCart, Plus, Minus, X, Check, ChevronRight, Package, Settings,
  Share2, Eye, Trash2, MessageCircle, CreditCard, ArrowLeft, Copy,
  TrendingUp, Users, ShoppingBag, Loader, Store, LogIn,
  BarChart2, RefreshCw,
} from "lucide-react";

// ============================================================
// ⚙️  GANTI URL INI DENGAN URL APPS SCRIPT LO
// Apps Script → Deploy → New Deployment → Web App → Copy URL
// ============================================================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyas-NPiDzsIH9aIg5OtsP-29k_tIjWGPN7kIg6x3ZiY_h8vRO7MhIDS-nvu9lMLfo0CA/exec;

// ============================================================
// API
// ============================================================
async function apiGet(params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${APPS_SCRIPT_URL}?${query}`);
  return res.json();
}
async function apiPost(body) {
  const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(body) });
  return res.json();
}
const API = {
  getCatalog:     (slug)          => apiGet({ action: "getCatalog", slug }),
  loginSeller:    (slug, kode)    => apiGet({ action: "loginSeller", slug, kode }),
  getAnalytics:   (seller_id)     => apiGet({ action: "getAnalytics", seller_id }),
  registerSeller: (data)          => apiPost({ action: "registerSeller", data }),
  updateSeller:   (data)          => apiPost({ action: "updateSeller", data }),
  saveProduct:    (data)          => apiPost({ action: "saveProduct", data }),
  toggleProduct:  (sellerId, pid) => apiPost({ action: "toggleProduct", seller_id: sellerId, product_id: pid }),
  deleteProduct:  (sellerId, pid) => apiPost({ action: "deleteProduct", seller_id: sellerId, product_id: pid }),
  createOrder:    (data)          => apiPost({ action: "createOrder", data }),
  trackVisit:     (seller_id)     => apiPost({ action: "trackVisit", seller_id }),
};
function isConnected() { return APPS_SCRIPT_URL !== "GANTI_URL_APPS_SCRIPT_DI_SINI"; }

// ============================================================
// HELPERS
// ============================================================
function formatRupiah(n) { return "Rp " + Number(n).toLocaleString("id-ID"); }
function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}
function compressImage(dataUrl, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}
function ProductImage({ src, alt = "", className = "" }) {
  const isReal = src && (src.startsWith("http") || src.startsWith("data:"));
  if (!isReal) return <div className={`flex items-center justify-center text-5xl ${className}`}>{src || "📦"}</div>;
  return <img src={src} alt={alt} className={`object-cover ${className}`} />;
}
function getProductImage(p) { return p.image_url || p.image || "📦"; }

const SESSION_KEY = "katalogku_seller_session";
function saveSession(slug, kode) { try { localStorage.setItem(SESSION_KEY, JSON.stringify({ slug, kode })); } catch {} }
function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } }
function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch {} }

// ============================================================
// DUMMY DATA
// ============================================================
const DUMMY_SELLER = { id: "dummy", name: "Dapur Bu Sari", tagline: "Masakan rumahan enak & terjangkau 🍳", wa: "6281234567890", slug: "dapur-bu-sari", payment_mode: "both", logo: "🍳", color: "#16a34a" };
const DUMMY_PRODUCTS = [
  { id: 1, name: "Nasi Box Ayam Geprek", price: 18000, stock: 50, image: "🍱", category: "F&B", active: true },
  { id: 2, name: "Es Teh Manis", price: 5000, stock: 30, image: "🧋", category: "F&B", active: true },
  { id: 3, name: "Paket Hemat A", price: 20000, stock: 20, image: "🎁", category: "Paket", active: true },
  { id: 4, name: "Nasi Box Rendang", price: 20000, stock: 15, image: "🍛", category: "F&B", active: true },
];

const THEME_COLORS = ["#16a34a","#2563eb","#dc2626","#d97706","#7c3aed","#db2777","#0891b2","#059669","#ea580c","#4f46e5"];
const LOGO_EMOJIS  = ["🛒","🍳","👗","💄","📱","🎮","📚","🌸","🍕","☕","🎂","🏪","💍","🐾","🌿"];

// ============================================================
// LOADING
// ============================================================
function LoadingScreen({ text = "Memuat..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
      <Loader size={32} className="animate-spin text-green-500" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

// ============================================================
// REGISTER SELLER
// ============================================================
function RegisterSeller({ onSuccess, onBack }) {
  const [form, setForm]             = useState({ name: "", wa: "", slug: "", color: "#16a34a", logo: "🛒", tagline: "" });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [kodeResult, setKodeResult] = useState(null);
  const [copied, setCopied]         = useState(false);
  const [showEmoji, setShowEmoji]   = useState(false);

  function handleNameChange(e) {
    const name = e.target.value;
    setForm(f => ({ ...f, name, slug: slugify(name) }));
  }

  async function handleSubmit() {
    if (!form.name || !form.wa || !form.slug) { setError("Nama toko, WA, dan slug wajib diisi"); return; }
    const waClean = form.wa.replace(/\D/g, "").replace(/^0/, "62");
    if (waClean.length < 8) { setError("Nomor WA tidak valid"); return; }
    setLoading(true); setError("");
    try {
      const res = await API.registerSeller({ ...form, wa: waClean });
      if (res.error) { setError(res.error); setLoading(false); return; }
      setKodeResult({ kode: res.kode_unik, slug: res.slug });
    } catch { setError("Koneksi gagal. Cek APPS_SCRIPT_URL."); }
    setLoading(false);
  }

  if (kodeResult) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm p-6 text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Toko Berhasil Dibuat!</h2>
        <p className="text-sm text-gray-400 mb-5">Simpan kode unik ini. Kamu butuhnya untuk login.</p>
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-4">
          <p className="text-xs text-green-600 font-semibold mb-2">KODE UNIK LO</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-3xl font-black tracking-widest text-green-700 font-mono">{kodeResult.kode}</span>
            <button onClick={() => { navigator.clipboard?.writeText(kodeResult.kode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
              {copied ? <><Check size={14}/> Copied!</> : <><Copy size={14}/> Copy</>}
            </button>
          </div>
        </div>
        <div className="bg-gray-50 rounded-2xl p-3 mb-4 text-left">
          <p className="text-xs text-gray-400 mb-1">Link katalog kamu</p>
          <p className="font-semibold text-gray-700 text-sm">katalog.id/{kodeResult.slug}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-5 text-xs text-yellow-700 text-left">
          ⚠️ Screenshot halaman ini! Kode <strong>{kodeResult.kode}</strong> tidak bisa dilihat lagi setelah ditutup.
        </div>
        <button onClick={() => onSuccess(kodeResult.slug, kodeResult.kode)}
          className="w-full py-4 rounded-2xl text-white font-bold bg-green-600">Masuk ke Dashboard →</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400"><ArrowLeft size={20}/></button>
        <h1 className="font-bold text-gray-800">Daftar Toko Baru</h1>
      </div>
      <div className="p-4 space-y-4 max-w-sm mx-auto">
        {/* Logo */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-semibold text-gray-500 block mb-2">Logo Toko</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowEmoji(!showEmoji)}
              className="w-14 h-14 rounded-2xl border-2 border-gray-200 text-4xl flex items-center justify-center hover:border-green-400 transition">
              {form.logo}
            </button>
            <p className="text-xs text-gray-400">Tap untuk ganti emoji</p>
          </div>
          {showEmoji && (
            <div className="mt-3 flex flex-wrap gap-2">
              {LOGO_EMOJIS.map(e => (
                <button key={e} onClick={() => { setForm(f => ({...f, logo: e})); setShowEmoji(false); }}
                  className={`w-10 h-10 rounded-xl text-2xl flex items-center justify-center border-2 ${form.logo === e ? "border-green-500 bg-green-50" : "border-gray-100"}`}>{e}</button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Nama Toko *</label>
            <input value={form.name} onChange={handleNameChange} placeholder="Contoh: Dapur Bu Sari"
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Tagline (opsional)</label>
            <input value={form.tagline} onChange={e => setForm(f => ({...f, tagline: e.target.value}))}
              placeholder="Masakan rumahan enak & murah 🍳"
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Nomor WhatsApp *</label>
            <input value={form.wa} onChange={e => setForm(f => ({...f, wa: e.target.value}))} placeholder="08123456789" type="tel"
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Slug (URL toko) *</label>
            <div className="flex items-center border rounded-xl overflow-hidden focus-within:border-green-500">
              <span className="px-3 text-xs text-gray-400 bg-gray-50 border-r py-3 whitespace-nowrap">katalog.id/</span>
              <input value={form.slug} onChange={e => setForm(f => ({...f, slug: slugify(e.target.value)}))} placeholder="nama-toko"
                className="flex-1 px-3 py-3 text-sm outline-none bg-white" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Otomatis dari nama toko, bisa diedit</p>
          </div>
        </div>

        {/* Warna */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-semibold text-gray-500 block mb-2">Warna Tema</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {THEME_COLORS.map(c => (
              <button key={c} onClick={() => setForm(f => ({...f, color: c}))}
                className="w-8 h-8 rounded-full border-2 transition"
                style={{ backgroundColor: c, borderColor: form.color === c ? "#111" : "transparent" }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={form.color} onChange={e => setForm(f => ({...f, color: e.target.value}))}
              className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0.5" />
            <span className="text-xs text-gray-400">Atau pilih warna custom</span>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl overflow-hidden shadow-sm">
          <div className="text-white pt-6 pb-4 px-4 text-center" style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)` }}>
            <div className="text-4xl mb-1">{form.logo}</div>
            <div className="font-bold">{form.name || "Nama Toko"}</div>
            <div className="text-xs opacity-70 mt-0.5">{form.tagline || "Tagline toko kamu"}</div>
            <div className="text-xs opacity-40 mt-1">katalog.id/{form.slug || "nama-toko"}</div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2"
          style={{ backgroundColor: form.color }}>
          {loading ? <><Loader size={18} className="animate-spin"/> Mendaftar...</> : "Daftar Sekarang →"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// LOGIN SELLER
// ============================================================
function LoginSeller({ onSuccess, onBack }) {
  const [slug, setSlug]     = useState("");
  const [kode, setKode]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function handleLogin() {
    if (!slug || !kode) { setError("Slug dan kode wajib diisi"); return; }
    setLoading(true); setError("");
    try {
      const res = await API.loginSeller(slug.trim(), kode.trim().toUpperCase());
      if (res.error) { setError(res.error); setLoading(false); return; }
      saveSession(slug.trim(), kode.trim().toUpperCase());
      onSuccess(res.seller, res.products);
    } catch { setError("Koneksi gagal. Cek APPS_SCRIPT_URL."); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400"><ArrowLeft size={20}/></button>
        <h1 className="font-bold text-gray-800">Login Seller</h1>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🔑</div>
            <h2 className="text-xl font-bold text-gray-800">Masuk ke Dashboard</h2>
            <p className="text-sm text-gray-400 mt-1">Pakai slug + kode unik dari saat daftar</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Slug Toko</label>
              <div className="flex items-center border rounded-xl overflow-hidden focus-within:border-green-500">
                <span className="px-3 text-xs text-gray-400 bg-gray-50 border-r py-3 whitespace-nowrap">katalog.id/</span>
                <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="nama-toko"
                  className="flex-1 px-3 py-3 text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Kode Unik (6 karakter)</label>
              <input value={kode} onChange={e => setKode(e.target.value.toUpperCase())} placeholder="XXXXXX"
                maxLength={6}
                className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 font-mono tracking-[0.3em] text-xl text-center uppercase" />
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 bg-green-600">
            {loading ? <><Loader size={18} className="animate-spin"/> Memverifikasi...</> : <><LogIn size={18}/> Masuk Dashboard</>}
          </button>
          <p className="text-center text-xs text-gray-400">
            Belum punya toko?{" "}
            <button onClick={onBack} className="text-green-600 font-semibold">Daftar dulu</button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BUYER VIEW
// ============================================================
function BuyerView({ seller, products, onBack }) {
  const [cart, setCart]                 = useState({});
  const [showCart, setShowCart]         = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(null);
  const [buyerName, setBuyerName]       = useState("");
  const [buyerNote, setBuyerNote]       = useState("");
  const [submitting, setSubmitting]     = useState(false);

  const color = seller.color || "#16a34a";
  const activeProducts = products.filter(p => (p.active === true || p.active === "TRUE") && p.stock > 0);
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(p => String(p.id) === String(id));
    return sum + (p ? Number(p.price) * qty : 0);
  }, 0);

  function addToCart(id) { setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 })); }
  function removeFromCart(id) { setCart(c => { const n = {...c}; if (n[id] > 1) n[id]--; else delete n[id]; return n; }); }

  function buildWAMessage() {
    const lines = Object.entries(cart).map(([id, qty]) => {
      const p = products.find(p => String(p.id) === String(id));
      return `• ${p.name} x${qty} = ${formatRupiah(Number(p.price) * qty)}`;
    });
    return encodeURIComponent(`Halo kak, saya mau order:\n\n${lines.join("\n")}\n\n*Total: ${formatRupiah(totalPrice)}*\n\nNama: ${buyerName || "(belum diisi)"}\nCatatan: ${buyerNote || "-"}\n\nMohon konfirmasi ya kak 🙏`);
  }

  async function handleCheckout(method) {
    setSubmitting(true);
    if (isConnected()) {
      const items = Object.entries(cart).map(([id, qty]) => {
        const p = products.find(p => String(p.id) === String(id));
        return { id, name: p.name, price: p.price, qty };
      });
      await API.createOrder({ seller_id: seller.id, buyer_name: buyerName, buyer_note: buyerNote, items, total: totalPrice, method });
    }
    if (method === "wa") window.open(`https://wa.me/${seller.wa}?text=${buildWAMessage()}`, "_blank");
    setSubmitting(false); setCheckoutDone(method);
  }

  if (checkoutDone) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">{checkoutDone === "wa" ? "💬" : "✅"}</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        {checkoutDone === "wa" ? "Order Dikirim ke WhatsApp!" : "Pembayaran Berhasil!"}
      </h2>
      <p className="text-gray-500 text-sm mb-6">{checkoutDone === "wa" ? "Tunggu konfirmasi dari penjual ya 🙏" : "Pesanan kamu sedang diproses."}</p>
      <button onClick={() => { setCheckoutDone(null); setCart({}); setShowCheckout(false); setShowCart(false); }}
        className="px-6 py-3 rounded-xl text-white font-semibold" style={{ backgroundColor: color }}>
        Kembali ke Katalog
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="text-white pt-8 pb-6 px-4 text-center relative" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        {onBack && <button onClick={onBack} className="absolute left-4 top-4 text-white opacity-70"><ArrowLeft size={20}/></button>}
        <div className="text-5xl mb-2">{seller.logo}</div>
        <h1 className="text-xl font-bold">{seller.name}</h1>
        <p className="text-sm opacity-80 mt-1">{seller.tagline}</p>
        <div className="mt-2 text-xs opacity-50">katalog.id/{seller.slug}</div>
      </div>

      <div className="p-4">
        <h2 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Produk Tersedia</h2>
        {activeProducts.length === 0 && <div className="text-center text-gray-400 py-12 text-sm">Belum ada produk aktif</div>}
        <div className="grid grid-cols-2 gap-3">
          {activeProducts.map(p => {
            const qty = cart[p.id] || 0;
            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="h-36 w-full overflow-hidden" style={{ backgroundColor: color + "15" }}>
                  <ProductImage src={getProductImage(p)} alt={p.name} className="w-full h-full" />
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold text-gray-800 leading-tight">{p.name}</div>
                  <div className="text-sm font-bold mt-1" style={{ color }}>{formatRupiah(p.price)}</div>
                  <div className="mt-2">
                    {qty === 0 ? (
                      <button onClick={() => addToCart(p.id)} className="w-full py-1.5 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: color }}>+ Tambah</button>
                    ) : (
                      <div className="flex items-center justify-between">
                        <button onClick={() => removeFromCart(p.id)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Minus size={14}/></button>
                        <span className="font-bold text-sm">{qty}</span>
                        <button onClick={() => addToCart(p.id)} className="w-8 h-8 rounded-lg text-white flex items-center justify-center" style={{ backgroundColor: color }}><Plus size={14}/></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {totalItems > 0 && !showCart && (
        <div className="fixed bottom-6 left-4 right-4">
          <button onClick={() => setShowCart(true)} className="w-full py-4 px-6 rounded-2xl text-white flex items-center justify-between shadow-xl" style={{ backgroundColor: color }}>
            <div className="flex items-center gap-2"><ShoppingCart size={20}/><span className="font-bold">{totalItems} item</span></div>
            <span className="font-bold">{formatRupiah(totalPrice)}</span>
          </button>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-40 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg">Keranjang</h3>
              <button onClick={() => setShowCart(false)}><X size={20}/></button>
            </div>
            <div className="p-4 space-y-3">
              {Object.entries(cart).map(([id, qty]) => {
                const p = products.find(p => String(p.id) === String(id));
                return (
                  <div key={id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: color + "15" }}>
                      <ProductImage src={getProductImage(p)} alt={p.name} className="w-full h-full" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-sm" style={{ color }}>{formatRupiah(p.price)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromCart(p.id)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><Minus size={12}/></button>
                      <span className="w-5 text-center font-bold text-sm">{qty}</span>
                      <button onClick={() => addToCart(p.id)} className="w-7 h-7 rounded-lg text-white flex items-center justify-center" style={{ backgroundColor: color }}><Plus size={12}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t">
              <div className="flex justify-between mb-4">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-lg">{formatRupiah(totalPrice)}</span>
              </div>
              <button onClick={() => { setShowCart(false); setShowCheckout(true); }} className="w-full py-4 rounded-2xl text-white font-bold" style={{ backgroundColor: color }}>
                Lanjut Checkout →
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg">Checkout</h3>
              <button onClick={() => setShowCheckout(false)}><X size={20}/></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Nama Kamu</label>
                <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Contoh: Budi"
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Catatan (opsional)</label>
                <textarea value={buyerNote} onChange={e => setBuyerNote(e.target.value)} placeholder="Misal: pedas sedang, tanpa bawang..."
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 resize-none" rows={2} />
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                {Object.entries(cart).map(([id, qty]) => {
                  const p = products.find(p => String(p.id) === String(id));
                  return (
                    <div key={id} className="flex justify-between text-sm">
                      <span className="text-gray-500">{p.name} x{qty}</span>
                      <span className="font-semibold">{formatRupiah(Number(p.price) * qty)}</span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span><span style={{ color }}>{formatRupiah(totalPrice)}</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-600">Pilih cara bayar:</p>
              {(seller.payment_mode === "wa" || seller.payment_mode === "both") && (
                <button onClick={() => handleCheckout("wa")} disabled={submitting}
                  className="w-full py-4 rounded-2xl border-2 flex items-center gap-3 px-4 hover:bg-green-50 transition" style={{ borderColor: "#22c55e" }}>
                  <MessageCircle size={24} className="text-green-500"/>
                  <div className="text-left flex-1">
                    <div className="font-bold text-sm">Order via WhatsApp</div>
                    <div className="text-xs text-gray-400">Konfirmasi & bayar ke penjual</div>
                  </div>
                  {submitting ? <Loader size={16} className="animate-spin text-gray-400"/> : <ChevronRight size={16} className="text-gray-400"/>}
                </button>
              )}
              {(seller.payment_mode === "payment" || seller.payment_mode === "both") && (
                <button onClick={() => handleCheckout("payment")} disabled={submitting}
                  className="w-full py-4 rounded-2xl border-2 flex items-center gap-3 px-4 hover:bg-blue-50 transition" style={{ borderColor: "#3b82f6" }}>
                  <CreditCard size={24} className="text-blue-500"/>
                  <div className="text-left flex-1">
                    <div className="font-bold text-sm">Bayar Sekarang</div>
                    <div className="text-xs text-gray-400">GoPay, OVO, DANA, QRIS, Transfer Bank</div>
                  </div>
                  {submitting ? <Loader size={16} className="animate-spin text-gray-400"/> : <ChevronRight size={16} className="text-gray-400"/>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SELLER DASHBOARD
// ============================================================
function SellerDashboard({ seller: initSeller, products: initProducts, onLogout }) {
  const [products, setProducts]         = useState(initProducts);
  const [seller, setSeller]             = useState(initSeller);
  const [activeTab, setActiveTab]       = useState("products");
  const [copied, setCopied]             = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreview, setShowPreview]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [newProduct, setNewProduct]     = useState({ name: "", price: "", stock: "", image: "", category: "" });
  const [imagePreview, setImagePreview] = useState(null);
  const [analytics, setAnalytics]       = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const color = seller.color || "#16a34a";

  useEffect(() => {
    if (!isConnected() || !seller.id || seller.id === "dummy") return;
    setLoadingStats(true);
    API.getAnalytics(seller.id)
      .then(res => { if (!res.error) setAnalytics(res); setLoadingStats(false); })
      .catch(() => setLoadingStats(false));
  }, [seller.id]);

  function refreshAnalytics() {
    if (!isConnected() || seller.id === "dummy") return;
    setLoadingStats(true);
    API.getAnalytics(seller.id)
      .then(res => { if (!res.error) setAnalytics(res); setLoadingStats(false); })
      .catch(() => setLoadingStats(false));
  }

  async function handleToggle(productId) {
    setProducts(ps => ps.map(p => String(p.id) === String(productId) ? { ...p, active: !(p.active === true || p.active === "TRUE") } : p));
    if (isConnected()) await API.toggleProduct(seller.id, productId);
  }
  async function handleDelete(productId) {
    setProducts(ps => ps.filter(p => String(p.id) !== String(productId)));
    if (isConnected()) await API.deleteProduct(seller.id, productId);
  }
  async function handleAddProduct() {
    if (!newProduct.name || !newProduct.price) return;
    setSaving(true);
    try {
      let image_base64 = "";
      if (newProduct.image?.startsWith("data:")) image_base64 = await compressImage(newProduct.image);
      const payload = { name: newProduct.name, price: +newProduct.price, stock: +newProduct.stock || 0, category: newProduct.category || "", seller_id: seller.id, active: true, image_base64 };
      let finalImageUrl = image_base64 || "📦";
      if (isConnected()) {
        const res = await API.saveProduct(payload);
        if (res.image_url) finalImageUrl = res.image_url;
        payload.id = res.id;
      } else { payload.id = Date.now(); }
      setProducts(ps => [...ps, { ...payload, image: finalImageUrl, image_url: finalImageUrl }]);
      setNewProduct({ name: "", price: "", stock: "", image: "", category: "" });
      setImagePreview(null); setShowAddModal(false);
    } catch (err) { alert("Gagal menyimpan: " + err.message); }
    setSaving(false);
  }
  async function handleUpdatePaymentMode(mode) {
    setSeller(s => ({ ...s, payment_mode: mode }));
    if (isConnected()) await API.updateSeller({ id: seller.id, payment_mode: mode });
  }

  const statsData = [
    { label: "Produk Aktif", value: products.filter(p => p.active === true || p.active === "TRUE").length, icon: <Package size={16}/>, color: "#16a34a" },
    { label: "Total Kunjungan", value: loadingStats ? "..." : (analytics?.total_visits ?? "-"), icon: <Users size={16}/>, color: "#3b82f6" },
    { label: "Total Order", value: loadingStats ? "..." : (analytics?.total_orders ?? "-"), icon: <ShoppingBag size={16}/>, color: "#f59e0b" },
    { label: "Omzet Total", value: loadingStats ? "..." : (analytics ? formatRupiah(analytics.total_revenue) : "-"), icon: <TrendingUp size={16}/>, color: "#8b5cf6" },
  ];

  if (showPreview) return <BuyerView seller={seller} products={products} onBack={() => setShowPreview(false)} />;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{seller.logo}</div>
          <div>
            <div className="font-bold text-gray-800">{seller.name}</div>
            <div className="text-xs text-gray-400">katalog.id/{seller.slug}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview(true)} className="flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-xl" style={{ backgroundColor: color + "15", color }}>
            <Eye size={16}/> Preview
          </button>
          <button onClick={onLogout} className="text-xs text-gray-400 px-2 py-2 rounded-xl hover:bg-gray-100">Logout</button>
        </div>
      </div>

      {/* Share Banner */}
      <div className="mx-4 mt-4 p-4 rounded-2xl text-white flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
        <div>
          <div className="text-xs opacity-70 mb-1">Link Katalog Kamu</div>
          <div className="font-bold">katalog.id/{seller.slug}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { navigator.clipboard?.writeText(`katalog.id/${seller.slug}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="bg-white/20 p-2 rounded-xl">{copied ? <Check size={16}/> : <Copy size={16}/>}</button>
          <button className="bg-white/20 p-2 rounded-xl"><Share2 size={16}/></button>
        </div>
      </div>

      {/* Analytics */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Analitik Real</span>
          <button onClick={refreshAnalytics} className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
            <RefreshCw size={12} className={loadingStats ? "animate-spin" : ""}/> Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {statsData.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1" style={{ color: s.color }}>{s.icon}<span className="text-xs text-gray-400">{s.label}</span></div>
              <div className="font-bold text-lg text-gray-800 truncate">{s.value}</div>
            </div>
          ))}
        </div>
        {analytics && (
          <div className="bg-white rounded-2xl p-3 shadow-sm mt-3 flex justify-between items-center">
            <div className="text-xs text-gray-500 font-medium">Order Hari Ini</div>
            <div className="text-right">
              <div className="font-bold text-gray-800">{analytics.today_orders} order</div>
              <div className="text-xs font-semibold" style={{ color }}>{formatRupiah(analytics.today_revenue)}</div>
            </div>
          </div>
        )}
        {seller.id === "dummy" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mt-3 text-xs text-yellow-600">
            ⚠️ Mode demo — analytics tidak tersedia. Login dengan akun seller untuk data real.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 bg-gray-100 rounded-2xl p-1">
        {["products", "settings"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${activeTab === tab ? "bg-white shadow text-gray-800" : "text-gray-400"}`}>
            {tab === "products" ? "Produk" : "Pengaturan"}
          </button>
        ))}
      </div>

      {/* Tab Produk */}
      {activeTab === "products" && (
        <div className="mx-4 mt-4 space-y-2">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                <ProductImage src={getProductImage(p)} alt={p.name} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-800 truncate">{p.name}</div>
                <div className="text-sm font-bold" style={{ color }}>{formatRupiah(p.price)}</div>
                <div className="text-xs text-gray-400">Stok: {p.stock}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(p.id)}
                  className={`text-xs px-2 py-1 rounded-lg font-medium ${(p.active === true || p.active === "TRUE") ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {(p.active === true || p.active === "TRUE") ? "Aktif" : "Nonaktif"}
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
          <button onClick={() => setShowAddModal(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed text-sm font-semibold flex items-center justify-center gap-2"
            style={{ borderColor: color, color }}>
            <Plus size={18}/> Tambah Produk
          </button>
        </div>
      )}

      {/* Tab Settings */}
      {activeTab === "settings" && (
        <div className="mx-4 mt-4 space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="font-bold text-gray-800 mb-3">Metode Pembayaran</div>
            <div className="space-y-2">
              {[
                { value: "wa", label: "WhatsApp Only", desc: "Semua order masuk ke WA kamu" },
                { value: "payment", label: "Bayar Langsung", desc: "Pembayaran via payment gateway" },
                { value: "both", label: "Keduanya", desc: "Buyer bisa pilih sendiri" },
              ].map(opt => (
                <button key={opt.value} onClick={() => handleUpdatePaymentMode(opt.value)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition ${seller.payment_mode === opt.value ? "border-green-500 bg-green-50" : "border-gray-100"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm text-gray-800">{opt.label}</div>
                    {seller.payment_mode === opt.value && <Check size={16} className="text-green-500"/>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="font-bold text-gray-800 mb-2">Info Akun</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-400">WA</span><span className="text-gray-700">{seller.wa}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Slug</span><span className="font-mono text-gray-700">{seller.slug}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">ID</span><span className="font-mono text-xs text-gray-500">{seller.id}</span></div>
            </div>
          </div>
          {!isConnected() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-700">
              ⚠️ Mode demo — ganti APPS_SCRIPT_URL untuk connect ke Google Sheet.
            </div>
          )}
          <button onClick={onLogout} className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold">
            Keluar dari Dashboard
          </button>
        </div>
      )}

      {/* Modal Tambah Produk */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Tambah Produk</h3>
              <button onClick={() => { setShowAddModal(false); setImagePreview(null); setNewProduct({ name: "", price: "", stock: "", image: "", category: "" }); }}><X size={20}/></button>
            </div>
            <input value={newProduct.name} onChange={e => setNewProduct(p => ({...p, name: e.target.value}))} placeholder="Nama produk"
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500" />
            <input value={newProduct.price} onChange={e => setNewProduct(p => ({...p, price: e.target.value}))} placeholder="Harga (Rp)" type="number"
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500" />
            <input value={newProduct.stock} onChange={e => setNewProduct(p => ({...p, stock: e.target.value}))} placeholder="Stok" type="number"
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500" />
            <div>
              <p className="text-xs text-gray-400 mb-2">Foto produk:</p>
              <label className="block cursor-pointer">
                <div className={`w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden ${imagePreview ? "" : "border-gray-200 bg-gray-50 hover:border-green-400"}`}
                  style={imagePreview ? { borderColor: color } : {}}>
                  {imagePreview ? <img src={imagePreview} alt="preview" className="w-full h-full object-cover" /> : (
                    <><div className="text-3xl mb-1">📷</div><p className="text-xs text-gray-400">Tap untuk upload foto</p></>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { alert("Maks 5MB ya!"); return; }
                  const reader = new FileReader();
                  reader.onload = ev => { setImagePreview(ev.target.result); setNewProduct(p => ({...p, image: ev.target.result})); };
                  reader.readAsDataURL(file);
                }} />
              </label>
              {imagePreview && (
                <button onClick={() => { setImagePreview(null); setNewProduct(p => ({...p, image: ""})); }} className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <X size={12}/> Hapus foto
                </button>
              )}
            </div>
            <button onClick={handleAddProduct} disabled={saving}
              className="w-full py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2" style={{ backgroundColor: color }}>
              {saving ? <><Loader size={16} className="animate-spin"/> {imagePreview ? "Mengupload gambar..." : "Menyimpan..."}</> : "Simpan Produk"}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex">
        <button onClick={() => setActiveTab("products")} className="flex-1 py-4 flex flex-col items-center gap-1"
          style={{ color: activeTab === "products" ? color : "#d1d5db" }}>
          <Package size={20}/><span className="text-xs font-medium">Produk</span>
        </button>
        <button className="flex-1 py-4 flex flex-col items-center gap-1 text-gray-300">
          <BarChart2 size={20}/><span className="text-xs">Analitik</span>
        </button>
        <button onClick={() => setActiveTab("settings")} className="flex-1 py-4 flex flex-col items-center gap-1"
          style={{ color: activeTab === "settings" ? color : "#d1d5db" }}>
          <Settings size={20}/><span className="text-xs">Setting</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ROOT APP
// ============================================================
export default function App() {
  const [view, setView]               = useState("init");
  const [catalogData, setCatalogData] = useState(null);
  const [sellerData, setSellerData]   = useState(null);

  useEffect(() => {
    const slug = window.location.pathname.replace(/^\//, "").trim();

    // 1. Slug routing — buyer
    if (slug && isConnected()) {
      API.getCatalog(slug).then(res => {
        if (res.seller) {
          setCatalogData(res);
          setView("buyer-live");
          API.trackVisit(res.seller.id).catch(() => {});
        } else {
          checkSession();
        }
      }).catch(() => checkSession());
      return;
    }

    checkSession();
  }, []);

  function checkSession() {
    const session = loadSession();
    if (session && isConnected()) {
      API.loginSeller(session.slug, session.kode).then(res => {
        if (!res.error) { setSellerData({ seller: res.seller, products: res.products }); setView("seller"); }
        else { clearSession(); setView("landing"); }
      }).catch(() => setView("landing"));
    } else {
      setView("landing");
    }
  }

  function handleLoginSuccess(seller, products) {
    setSellerData({ seller, products }); setView("seller");
  }
  function handleRegisterSuccess(slug, kode) {
    setView("init");
    API.loginSeller(slug, kode).then(res => {
      if (!res.error) { saveSession(slug, kode); setSellerData({ seller: res.seller, products: res.products }); setView("seller"); }
      else setView("landing");
    }).catch(() => setView("landing"));
  }
  function handleLogout() {
    clearSession(); setSellerData(null); setView("landing");
    window.history.pushState({}, "", "/");
  }

  if (view === "init") return <LoadingScreen text="Memuat KatalogKu..." />;
  if (view === "buyer-live" && catalogData) return <BuyerView seller={catalogData.seller} products={catalogData.products} />;
  if (view === "buyer-demo") return <BuyerView seller={DUMMY_SELLER} products={DUMMY_PRODUCTS} onBack={() => setView("landing")} />;
  if (view === "seller-demo") return <SellerDashboard seller={DUMMY_SELLER} products={DUMMY_PRODUCTS} onLogout={() => setView("landing")} />;
  if (view === "seller" && sellerData) return <SellerDashboard seller={sellerData.seller} products={sellerData.products} onLogout={handleLogout} />;
  if (view === "register") return <RegisterSeller onSuccess={handleRegisterSuccess} onBack={() => setView("landing")} />;
  if (view === "login") return <LoginSeller onSuccess={handleLoginSuccess} onBack={() => setView("landing")} />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="text-6xl mb-4">🛒</div>
      <h1 className="text-2xl font-bold text-gray-800 text-center mb-1">KatalogKu</h1>
      <p className="text-gray-400 text-sm text-center mb-2">Linktree tapi bisa order & bayar</p>
      {!isConnected() && (
        <div className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-xl mb-4 text-center">
          ⚠️ Mode demo — ganti <code className="font-mono">APPS_SCRIPT_URL</code>
        </div>
      )}
      <div className="w-full max-w-sm space-y-3 mt-4">
        <button onClick={() => setView("register")}
          className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 bg-green-600">
          <Store size={20}/> Daftar Toko Baru
        </button>
        <button onClick={() => setView("login")}
          className="w-full py-4 rounded-2xl font-bold text-base border-2 border-green-600 text-green-600 flex items-center justify-center gap-2">
          <LogIn size={20}/> Login Seller
        </button>
        <div className="relative my-2">
          <div className="border-t border-gray-200"/>
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gray-50 px-3 text-xs text-gray-400">atau coba demo</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("buyer-demo")}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-gray-500 bg-white border border-gray-200 flex items-center justify-center gap-1">
            <Eye size={15}/> Katalog Demo
          </button>
          <button onClick={() => setView("seller-demo")}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-gray-500 bg-white border border-gray-200 flex items-center justify-center gap-1">
            <Settings size={15}/> Dashboard Demo
          </button>
        </div>
      </div>
    </div>
  );
}
