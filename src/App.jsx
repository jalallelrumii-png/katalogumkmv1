import { useState, useEffect } from "react";
import { ShoppingCart, Plus, Minus, X, Check, ChevronRight, Package, Settings, Share2, Eye, Trash2, MessageCircle, CreditCard, ArrowLeft, Copy, TrendingUp, Users, ShoppingBag, Loader } from "lucide-react";

// ============================================================
// ✅ URL SUDAH DIUPDATE ke deployment baru lo
// ============================================================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwechypz-61FJWmdRC87qRD4ndrN-VC7pkVnivpIzBoXwSt64IpYjg7Dg_hwhhqJwg77g/exec";

// ============================================================
// API
// ============================================================
async function apiGet(params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${APPS_SCRIPT_URL}?${query}`);
  return res.json();
}
async function apiPost(body) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}
const API = {
  getCatalog: (slug) => apiGet({ action: "getCatalog", slug }),
  registerSeller: (data) => apiPost({ action: "registerSeller", data }),
  updateSeller: (data) => apiPost({ action: "updateSeller", data }),
  saveProduct: (data) => apiPost({ action: "saveProduct", data }),
  toggleProduct: (sellerId, productId) => apiPost({ action: "toggleProduct", sellerId, productId }),
  deleteProduct: (sellerId, productId) => apiPost({ action: "deleteProduct", sellerId, productId }),
  createOrder: (data) => apiPost({ action: "createOrder", data }),
};

// Compress gambar sebelum upload
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

// ============================================================
// HELPERS
// ============================================================
function formatRupiah(n) {
  return "Rp " + Number(n).toLocaleString("id-ID");
}

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

function ProductImage({ src, alt = "", className = "", style = {} }) {
  const isReal = src && (src.startsWith("http") || src.startsWith("data:"));
  if (!isReal) {
    return (
      <div className={`flex items-center justify-center text-5xl ${className}`} style={style}>
        {src || "📦"}
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-cover ${className}`} style={style} />;
}

function getProductImage(p) {
  return p.image_url || p.image || "📦";
}

// ============================================================
// KOMPONEN: LOADING
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
// KOMPONEN: REGISTER / LOGIN FORM  ← INI YANG BARU
// ============================================================
function RegisterForm({ onSuccess }) {
  const [mode, setMode] = useState("choose"); // "choose" | "register" | "login"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Register state
  const [form, setForm] = useState({
    name: "", tagline: "", wa: "", slug: "", logo: "🛍️", color: "#16a34a",
  });

  // Login state
  const [loginSlug, setLoginSlug] = useState("");

  const COLOR_OPTIONS = ["#16a34a", "#2563eb", "#dc2626", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];
  const EMOJI_OPTIONS = ["🛍️", "🍱", "☕", "👗", "💄", "🎂", "🔧", "📱", "🧁", "🌸", "🎸", "🌿"];

  function handleNameChange(val) {
    setForm(f => ({ ...f, name: val, slug: slugify(val) }));
  }

  async function handleRegister() {
    if (!form.name || !form.wa || !form.slug) {
      setError("Nama toko, nomor WA, dan slug wajib diisi."); return;
    }
    setLoading(true); setError("");
    try {
      const res = await API.registerSeller({ ...form, payment_mode: "wa" });
      if (res.error && !res.seller) {
        setError(res.error); setLoading(false); return;
      }
      // Slug sudah dipakai → return existing seller
      if (res.seller) {
        onSuccess(res.seller, []);
        return;
      }
      // Sukses register baru — langsung fetch katalog untuk dapat seller object lengkap
      const catalog = await API.getCatalog(form.slug);
      if (catalog.seller) {
        onSuccess(catalog.seller, catalog.products || []);
      } else {
        // Fallback: buat seller object dari form
        onSuccess({ ...form, id: res.id }, []);
      }
    } catch (e) {
      setError("Gagal terhubung ke server. Cek koneksi internet.");
    }
    setLoading(false);
  }

  async function handleLogin() {
    if (!loginSlug) { setError("Masukkan slug toko kamu."); return; }
    setLoading(true); setError("");
    try {
      const res = await API.getCatalog(loginSlug.trim());
      if (res.error || !res.seller) {
        setError("Toko dengan slug itu tidak ditemukan. Cek ejaan slug kamu."); setLoading(false); return;
      }
      onSuccess(res.seller, res.products || []);
    } catch (e) {
      setError("Gagal terhubung ke server.");
    }
    setLoading(false);
  }

  if (mode === "choose") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-1">KatalogKu</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Toko online instan via WhatsApp</p>
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => setMode("register")}
            className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg"
            style={{ backgroundColor: "#16a34a" }}
          >
            🏪 Buka Toko Baru
          </button>
          <button
            onClick={() => setMode("login")}
            className="w-full py-4 rounded-2xl font-bold text-base border-2"
            style={{ borderColor: "#16a34a", color: "#16a34a" }}
          >
            🔑 Masuk ke Toko Saya
          </button>
        </div>
      </div>
    );
  }

  if (mode === "login") {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
        <button onClick={() => { setMode("choose"); setError(""); }} className="flex items-center gap-2 text-gray-500 mb-6 self-start">
          <ArrowLeft size={18} /> Kembali
        </button>
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="text-4xl mb-3 text-center">🔑</div>
          <h2 className="text-xl font-bold text-center text-gray-800 mb-1">Masuk ke Toko</h2>
          <p className="text-gray-400 text-sm text-center mb-6">Masukkan slug toko kamu</p>
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Slug Toko</label>
              <div className="flex items-center gap-2 border rounded-xl px-3 py-3 focus-within:border-green-500">
                <span className="text-gray-400 text-sm">katalog.id/</span>
                <input
                  value={loginSlug}
                  onChange={(e) => { setLoginSlug(e.target.value); setError(""); }}
                  placeholder="nama-toko-kamu"
                  className="flex-1 outline-none text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>
            {error && <div className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</div>}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2"
              style={{ backgroundColor: "#16a34a" }}
            >
              {loading ? <><Loader size={16} className="animate-spin" /> Mencari...</> : "Masuk →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // mode === "register"
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <button onClick={() => { setMode("choose"); setError(""); }} className="text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-gray-800">Buat Toko Baru</h2>
      </div>

      <div className="p-4 space-y-4 max-w-sm mx-auto">
        {/* Emoji & Color Picker */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Icon Toko</div>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map(e => (
              <button key={e} onClick={() => setForm(f => ({ ...f, logo: e }))}
                className={`text-2xl w-11 h-11 rounded-xl flex items-center justify-center transition ${form.logo === e ? "ring-2 ring-green-500 bg-green-50" : "bg-gray-50"}`}>
                {e}
              </button>
            ))}
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">Warna Tema</div>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                className={`w-9 h-9 rounded-full transition ${form.color === c ? "ring-2 ring-offset-2 ring-gray-800" : ""}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        {/* Preview mini */}
        <div className="rounded-2xl overflow-hidden shadow-sm">
          <div className="py-4 px-4 text-white text-center" style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)` }}>
            <div className="text-3xl mb-1">{form.logo}</div>
            <div className="font-bold">{form.name || "Nama Toko Kamu"}</div>
            <div className="text-xs opacity-70 mt-0.5">{form.tagline || "Tagline toko..."}</div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Nama Toko *</label>
            <input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: Dapur Bu Sari"
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Tagline</label>
            <input
              value={form.tagline}
              onChange={(e) => setForm(f => ({ ...f, tagline: e.target.value }))}
              placeholder="Masakan rumahan enak & terjangkau"
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Nomor WhatsApp *</label>
            <input
              value={form.wa}
              onChange={(e) => setForm(f => ({ ...f, wa: e.target.value }))}
              placeholder="628123456789 (tanpa + atau spasi)"
              type="tel"
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">Format: 628xxx — nomor WA yang aktif</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Slug (Alamat Toko) *</label>
            <div className="flex items-center gap-2 border rounded-xl px-3 py-3 focus-within:border-green-500">
              <span className="text-gray-400 text-sm">katalog.id/</span>
              <input
                value={form.slug}
                onChange={(e) => { setForm(f => ({ ...f, slug: slugify(e.target.value) })); setError(""); }}
                placeholder="nama-toko"
                className="flex-1 outline-none text-sm"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Hanya huruf kecil, angka, dan tanda hubung</p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            ❌ {error}
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg"
          style={{ backgroundColor: form.color }}
        >
          {loading ? <><Loader size={16} className="animate-spin" /> Membuat toko...</> : `${form.logo} Buat Toko Sekarang`}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// KOMPONEN: BUYER VIEW
// ============================================================
function BuyerView({ seller, products, onBack }) {
  const [cart, setCart] = useState({});
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerNote, setBuyerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const color = seller.color || "#16a34a";
  const activeProducts = products.filter((p) => (p.active === true || p.active === "TRUE") && p.stock > 0);
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find((p) => String(p.id) === String(id));
    return sum + (p ? Number(p.price) * qty : 0);
  }, 0);

  function addToCart(id) { setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 })); }
  function removeFromCart(id) {
    setCart((c) => { const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n; });
  }

  function buildWAMessage() {
    const lines = Object.entries(cart).map(([id, qty]) => {
      const p = products.find((p) => String(p.id) === String(id));
      return `• ${p.name} x${qty} = ${formatRupiah(Number(p.price) * qty)}`;
    });
    return encodeURIComponent(
      `Halo kak, saya mau order:\n\n${lines.join("\n")}\n\n*Total: ${formatRupiah(totalPrice)}*\n\nNama: ${buyerName || "(belum diisi)"}\nCatatan: ${buyerNote || "-"}\n\nMohon konfirmasi ya kak 🙏`
    );
  }

  async function handleCheckout(method) {
    setSubmitting(true);
    const items = Object.entries(cart).map(([id, qty]) => {
      const p = products.find((p) => String(p.id) === String(id));
      return { id, name: p.name, price: p.price, qty };
    });
    await API.createOrder({ seller_id: seller.id, buyer_name: buyerName, buyer_note: buyerNote, items, total: totalPrice, method });
    if (method === "wa") {
      window.open(`https://wa.me/${seller.wa}?text=${buildWAMessage()}`, "_blank");
    }
    setSubmitting(false);
    setCheckoutDone(method);
  }

  if (checkoutDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">{checkoutDone === "wa" ? "💬" : "✅"}</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          {checkoutDone === "wa" ? "Order Dikirim ke WhatsApp!" : "Pembayaran Berhasil!"}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {checkoutDone === "wa" ? "Tunggu konfirmasi dari penjual ya 🙏" : "Pesanan kamu sedang diproses."}
        </p>
        <button
          onClick={() => { setCheckoutDone(null); setCart({}); setShowCheckout(false); setShowCart(false); }}
          className="px-6 py-3 rounded-xl text-white font-semibold"
          style={{ backgroundColor: color }}
        >
          Kembali ke Katalog
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="text-white pt-8 pb-6 px-4 text-center relative" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        {onBack && (
          <button onClick={onBack} className="absolute left-4 top-4 text-white opacity-70">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="text-5xl mb-2">{seller.logo}</div>
        <h1 className="text-xl font-bold">{seller.name}</h1>
        <p className="text-sm opacity-80 mt-1">{seller.tagline}</p>
        <div className="mt-2 text-xs opacity-50">katalog.id/{seller.slug}</div>
      </div>

      <div className="p-4">
        <h2 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Produk Tersedia</h2>
        {activeProducts.length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">Belum ada produk aktif</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {activeProducts.map((p) => {
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
                      <button onClick={() => addToCart(p.id)} className="w-full py-1.5 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: color }}>
                        + Tambah
                      </button>
                    ) : (
                      <div className="flex items-center justify-between">
                        <button onClick={() => removeFromCart(p.id)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Minus size={14} /></button>
                        <span className="font-bold text-sm">{qty}</span>
                        <button onClick={() => addToCart(p.id)} className="w-8 h-8 rounded-lg text-white flex items-center justify-center" style={{ backgroundColor: color }}><Plus size={14} /></button>
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
            <div className="flex items-center gap-2"><ShoppingCart size={20} /><span className="font-bold">{totalItems} item</span></div>
            <span className="font-bold">{formatRupiah(totalPrice)}</span>
          </button>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-40 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg">Keranjang</h3>
              <button onClick={() => setShowCart(false)}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              {Object.entries(cart).map(([id, qty]) => {
                const p = products.find((p) => String(p.id) === String(id));
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
                      <button onClick={() => removeFromCart(p.id)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><Minus size={12} /></button>
                      <span className="w-5 text-center font-bold text-sm">{qty}</span>
                      <button onClick={() => addToCart(p.id)} className="w-7 h-7 rounded-lg text-white flex items-center justify-center" style={{ backgroundColor: color }}><Plus size={12} /></button>
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
              <button onClick={() => setShowCheckout(false)}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Nama Kamu</label>
                <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Contoh: Budi" className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Catatan (opsional)</label>
                <textarea value={buyerNote} onChange={(e) => setBuyerNote(e.target.value)} placeholder="Misal: pedas sedang, tanpa bawang..." className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 resize-none" rows={2} />
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                {Object.entries(cart).map(([id, qty]) => {
                  const p = products.find((p) => String(p.id) === String(id));
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
                <button onClick={() => handleCheckout("wa")} disabled={submitting} className="w-full py-4 rounded-2xl border-2 flex items-center gap-3 px-4 hover:bg-green-50 transition" style={{ borderColor: "#22c55e" }}>
                  <MessageCircle size={24} className="text-green-500" />
                  <div className="text-left flex-1">
                    <div className="font-bold text-sm">Order via WhatsApp</div>
                    <div className="text-xs text-gray-400">Konfirmasi & bayar ke penjual</div>
                  </div>
                  {submitting ? <Loader size={16} className="animate-spin text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </button>
              )}
              {(seller.payment_mode === "payment" || seller.payment_mode === "both") && (
                <button onClick={() => handleCheckout("payment")} disabled={submitting} className="w-full py-4 rounded-2xl border-2 flex items-center gap-3 px-4 hover:bg-blue-50 transition" style={{ borderColor: "#3b82f6" }}>
                  <CreditCard size={24} className="text-blue-500" />
                  <div className="text-left flex-1">
                    <div className="font-bold text-sm">Bayar Sekarang</div>
                    <div className="text-xs text-gray-400">GoPay, OVO, DANA, QRIS, Transfer Bank</div>
                  </div>
                  {submitting ? <Loader size={16} className="animate-spin text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
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
// KOMPONEN: SELLER DASHBOARD
// ============================================================
function SellerDashboard({ seller: initSeller, products: initProducts, onLogout }) {
  const [products, setProducts] = useState(initProducts);
  const [seller, setSeller] = useState(initSeller);
  const [activeTab, setActiveTab] = useState("products");
  const [copied, setCopied] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", stock: "", image: "", category: "" });
  const [imagePreview, setImagePreview] = useState(null);

  const color = seller.color || "#16a34a";

  async function handleToggle(productId) {
    setProducts((ps) => ps.map((p) => String(p.id) === String(productId) ? { ...p, active: !(p.active === true || p.active === "TRUE") } : p));
    await API.toggleProduct(seller.id, productId);
  }

  async function handleDelete(productId) {
    if (!confirm("Hapus produk ini?")) return;
    setProducts((ps) => ps.filter((p) => String(p.id) !== String(productId)));
    await API.deleteProduct(seller.id, productId);
  }

  async function handleAddProduct() {
    if (!newProduct.name || !newProduct.price) { alert("Nama dan harga wajib diisi"); return; }
    setSaving(true);
    try {
      let image_base64 = "";
      if (newProduct.image && newProduct.image.startsWith("data:")) {
        image_base64 = await compressImage(newProduct.image);
      }
      const payload = {
        name: newProduct.name, price: +newProduct.price, stock: +newProduct.stock || 0,
        category: newProduct.category || "", seller_id: seller.id, active: true, image_base64,
      };
      const res = await API.saveProduct(payload);
      const finalImageUrl = res.image_url || image_base64 || "📦";
      setProducts((ps) => [...ps, { ...payload, id: res.id, image: finalImageUrl, image_url: finalImageUrl }]);
      setNewProduct({ name: "", price: "", stock: "", image: "", category: "" });
      setImagePreview(null);
      setShowAddModal(false);
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    }
    setSaving(false);
  }

  async function handleUpdatePaymentMode(mode) {
    setSeller((s) => ({ ...s, payment_mode: mode }));
    await API.updateSeller({ id: seller.id, payment_mode: mode });
  }

  function handleCopyLink() {
    const link = `${window.location.origin}/${seller.slug}`;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const paymentOptions = [
    { value: "wa", label: "WhatsApp Only", desc: "Semua order masuk ke WA kamu" },
    { value: "payment", label: "Bayar Langsung", desc: "Pembayaran otomatis via payment gateway" },
    { value: "both", label: "Keduanya", desc: "Buyer bisa pilih sendiri" },
  ];

  if (showPreview) {
    return <BuyerView seller={seller} products={products} onBack={() => setShowPreview(false)} />;
  }

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
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPreview(true)} className="flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-xl" style={{ backgroundColor: color + "15", color }}>
            <Eye size={16} /> Preview
          </button>
          <button onClick={onLogout} className="text-xs text-gray-400 px-2 py-2 rounded-xl hover:bg-gray-100">Keluar</button>
        </div>
      </div>

      {/* Link Share Banner */}
      <div className="mx-4 mt-4 p-4 rounded-2xl text-white flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
        <div>
          <div className="text-xs opacity-70 mb-1">Link Katalog Kamu</div>
          <div className="font-bold text-sm">{window.location.origin}/{seller.slug}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCopyLink} className="bg-white/20 p-2 rounded-xl">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
        {[
          { label: "Produk Aktif", value: products.filter(p => p.active === true || p.active === "TRUE").length, icon: <Package size={16} />, color: "#16a34a" },
          { label: "Total Produk", value: products.length, icon: <ShoppingBag size={16} />, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1" style={{ color: s.color }}>
              {s.icon}<span className="text-xs text-gray-400">{s.label}</span>
            </div>
            <div className="font-bold text-lg text-gray-800">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 bg-gray-100 rounded-2xl p-1">
        {["products", "settings"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${activeTab === tab ? "bg-white shadow text-gray-800" : "text-gray-400"}`}>
            {tab === "products" ? "Produk" : "Pengaturan"}
          </button>
        ))}
      </div>

      {/* Tab Produk */}
      {activeTab === "products" && (
        <div className="mx-4 mt-4 space-y-2">
          {products.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">Belum ada produk — tambah sekarang!</div>
          )}
          {products.map((p) => (
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
                <button onClick={() => handleToggle(p.id)} className={`text-xs px-2 py-1 rounded-lg font-medium ${(p.active === true || p.active === "TRUE") ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {(p.active === true || p.active === "TRUE") ? "Aktif" : "Nonaktif"}
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-red-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          <button onClick={() => setShowAddModal(true)} className="w-full py-3 rounded-2xl border-2 border-dashed text-sm font-semibold flex items-center justify-center gap-2" style={{ borderColor: color, color }}>
            <Plus size={18} /> Tambah Produk
          </button>
        </div>
      )}

      {/* Tab Pengaturan */}
      {activeTab === "settings" && (
        <div className="mx-4 mt-4 space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="font-bold text-gray-800 mb-1">Metode Pembayaran</div>
            <div className="text-xs text-gray-400 mb-3">Pilih bagaimana buyer bisa bayar</div>
            <div className="space-y-2">
              {paymentOptions.map((opt) => (
                <button key={opt.value} onClick={() => handleUpdatePaymentMode(opt.value)} className={`w-full p-3 rounded-xl border-2 text-left transition ${seller.payment_mode === opt.value ? "border-green-500 bg-green-50" : "border-gray-100"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm text-gray-800">{opt.label}</div>
                    {seller.payment_mode === opt.value && <Check size={16} className="text-green-500" />}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="font-bold text-gray-800 mb-1">Nomor WhatsApp</div>
            <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3 mt-2">{seller.wa}</div>
          </div>
        </div>
      )}

      {/* Modal Tambah Produk */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Tambah Produk</h3>
              <button onClick={() => { setShowAddModal(false); setImagePreview(null); setNewProduct({ name: "", price: "", stock: "", image: "", category: "" }); }}><X size={20} /></button>
            </div>
            <input value={newProduct.name} onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="Nama produk *" className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500" />
            <input value={newProduct.price} onChange={(e) => setNewProduct(p => ({ ...p, price: e.target.value }))} placeholder="Harga (Rp) *" type="number" className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500" />
            <input value={newProduct.stock} onChange={(e) => setNewProduct(p => ({ ...p, stock: e.target.value }))} placeholder="Stok" type="number" className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500" />
            <div>
              <p className="text-xs text-gray-400 mb-2">Foto produk:</p>
              <label className="block cursor-pointer">
                <div className={`w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition ${imagePreview ? "border-transparent" : "border-gray-200 hover:border-green-400 bg-gray-50"}`} style={imagePreview ? { borderColor: color } : {}}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="text-3xl mb-1">📷</div>
                      <p className="text-xs text-gray-400">Tap untuk upload foto</p>
                      <p className="text-xs text-gray-300">JPG, PNG, WEBP maks 5MB</p>
                    </>
                  )}
                </div>
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { alert("Ukuran file maksimal 5MB ya!"); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => { setImagePreview(ev.target.result); setNewProduct(p => ({ ...p, image: ev.target.result })); };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {imagePreview && (
                <button onClick={() => { setImagePreview(null); setNewProduct(p => ({ ...p, image: "" })); }} className="mt-2 text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                  <X size={12} /> Hapus foto
                </button>
              )}
            </div>
            <button onClick={handleAddProduct} disabled={saving} className="w-full py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2" style={{ backgroundColor: color }}>
              {saving ? <><Loader size={16} className="animate-spin" /> {imagePreview ? "Mengupload gambar..." : "Menyimpan..."}</> : "Simpan Produk"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ROOT APP
// ============================================================
export default function App() {
  const [view, setView] = useState("loading"); // "loading" | "register" | "seller" | "buyer-live"
  const [sellerData, setSellerData] = useState(null);
  const [productsData, setProductsData] = useState([]);

  useEffect(() => {
    // Cek apakah URL mengandung slug → load katalog buyer
    const slug = window.location.pathname.replace("/", "").trim();
    if (slug && slug !== "") {
      API.getCatalog(slug).then((res) => {
        if (res.seller) {
          setSellerData(res.seller);
          setProductsData(res.products || []);
          setView("buyer-live");
        } else {
          setView("register");
        }
      }).catch(() => setView("register"));
    } else {
      setView("register");
    }
  }, []);

  function handleRegisterSuccess(seller, products) {
    setSellerData(seller);
    setProductsData(products);
    setView("seller");
  }

  if (view === "loading") return <LoadingScreen text="Memuat..." />;

  if (view === "buyer-live" && sellerData) {
    return <BuyerView seller={sellerData} products={productsData} />;
  }

  if (view === "seller" && sellerData) {
    return (
      <SellerDashboard
        seller={sellerData}
        products={productsData}
        onLogout={() => { setSellerData(null); setProductsData([]); setView("register"); }}
      />
    );
  }

  // Default: register/login
  return <RegisterForm onSuccess={handleRegisterSuccess} />;
}
