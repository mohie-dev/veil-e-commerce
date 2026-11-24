import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Facebook, Instagram, Menu, MessageCircle, Minus, Phone, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../lib/api';
import { useCart } from '../store/cart';
import type { StoreSettings } from '../types';
import { BrandLogo } from './BrandLogo';

export function StoreLayout() {
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cartCount = useCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const migrationNotice = useCart((state) => state.migrationNotice);
  const clearMigrationNotice = useCart((state) => state.clearMigrationNotice);
  const location = useLocation();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<StoreSettings>('/settings')) as unknown as StoreSettings });
  const phoneLink = settings?.phone?.replace(/[^\d+]/g, '');

  useEffect(() => {
    if (!migrationNotice) return;
    toast.info('Your bag now uses fragrance sizes. Please add your preferred size again.');
    clearMigrationNotice();
  }, [migrationNotice, clearMigrationNotice]);

  return (
    <div className="store-shell">
      <header className="site-header">
        <div className="announcement">COMPLIMENTARY DELIVERY ON ORDERS OVER EGP 1,500</div>
        <nav className="nav-wrap container">
          <Link className="brand-mark" to="/" aria-label="Veil home">
            <BrandLogo />
          </Link>
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
          <div className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
            <NavLink onClick={() => setMenuOpen(false)} to="/">Home</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/shop">Fragrances</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/packages">Gift sets</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/track">Track order</NavLink>
          </div>
          <button className="bag-trigger" onClick={() => setCartOpen(true)} aria-label="Open shopping bag">
            <span>Bag</span><ShoppingBag size={18} /><b>{cartCount}</b>
          </button>
        </nav>
      </header>
      <main key={location.pathname}><Outlet /></main>
      <footer className="site-footer">
        <div className="container footer-top">
          <div>
            <Link to="/" className="footer-logo" aria-label="Veil home"><BrandLogo className="brand-logo-footer" /></Link>
            <p>A quiet signature. An unforgettable trace.</p>
          </div>
          <div className="footer-links">
            <Link to="/shop">Shop fragrances</Link>
            <Link to="/packages">Gift sets</Link>
            <Link to="/track">Track your order</Link>
          </div>
          <div className="footer-contact">
            {settings?.phone && phoneLink && <a className="social-link" href={`tel:${phoneLink}`}><Phone size={16} /> {settings.phone}</a>}
            {settings?.whatsapp && <a className="social-link" href={whatsappHref(settings.whatsapp)} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>}
            {settings?.instagramUrl && <a className="social-link" href={settings.instagramUrl} target="_blank" rel="noreferrer"><Instagram size={16} /> Instagram</a>}
            {settings?.facebookUrl && <a className="social-link" href={settings.facebookUrl} target="_blank" rel="noreferrer"><Facebook size={16} /> Facebook</a>}
          </div>
        </div>
        <div className="container footer-bottom"><span>© {new Date().getFullYear()} {settings?.storeName || 'Veil Perfumes'}</span><span>Made to linger.</span></div>
      </footer>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const internationalNumber = digits.startsWith('00')
    ? digits.slice(2)
    : digits.startsWith('0')
      ? `20${digits.slice(1)}`
      : digits;
  return `https://wa.me/${internationalNumber}`;
}

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, setQuantity, removeItem } = useCart();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<StoreSettings>('/settings')) as unknown as StoreSettings });
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const threshold = settings?.freeShippingThreshold;
  const progress = threshold && threshold > 0 ? Math.min((subtotal / threshold) * 100, 100) : 100;
  const left = threshold ? Math.max(threshold - subtotal, 0) : 0;

  if (!open) return null;
  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="cart-drawer" aria-label="Shopping bag">
        <div className="drawer-heading"><div><span className="eyebrow">YOUR EDIT</span><h2>Shopping bag <span>({items.reduce((sum, item) => sum + item.quantity, 0)})</span></h2></div><button className="icon-button" onClick={onClose} aria-label="Close bag"><X /></button></div>
        <div className="shipping-meter">
          <p>{left > 0 ? <>You’re <strong>{money(left)}</strong> away from complimentary delivery</> : 'Complimentary delivery unlocked'}</p>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="cart-lines">
          {items.length === 0 ? <div className="empty-cart"><ShoppingBag size={28} /><p>Your bag is waiting for a trace.</p><Link className="text-link" to="/shop" onClick={onClose}>Discover fragrances <ArrowRight size={14} /></Link></div> : items.map((item) => (
            <article className="cart-line" key={`${item.itemType}-${item.itemId}`}>
              <img src={item.image || fallbackImage} alt={item.name} />
              <div className="cart-line-info"><Link to={`/${item.itemType === 'PRODUCT' ? 'products' : 'packages'}/${item.slug || item.itemId}`} onClick={onClose}>{item.name}</Link>{item.size && <small className="cart-line-size">{item.size}</small>}<span>{money(item.price)}</span>
                <div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => item.quantity === 1 ? removeItem(item.itemType, item.itemId) : setQuantity(item.itemType, item.itemId, item.quantity - 1)}><Minus size={13} /></button><span>{item.quantity}</span><button aria-label="Increase quantity" onClick={() => item.quantity >= item.maxStock ? toast.error('Maximum available quantity reached') : setQuantity(item.itemType, item.itemId, item.quantity + 1)}><Plus size={13} /></button></div>
              </div>
              <button className="remove-line" aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.itemType, item.itemId)}><Trash2 size={15} /></button>
            </article>
          ))}
        </div>
        {items.length > 0 && <div className="drawer-checkout"><div className="summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p>Delivery is calculated at checkout.</p><Link className="button button-dark button-full" to="/checkout" onClick={onClose}>Continue to checkout <ArrowRight size={15} /></Link><button className="continue-shopping" onClick={onClose}>Continue exploring</button></div>}
      </aside>
    </div>
  );
}

export function money(value: number) {
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value);
}

export function Price({ price, effectivePrice, hasActiveDiscount }: { price: number; effectivePrice: number; hasActiveDiscount: boolean }) {
  return <div className="price-line"><strong>{money(effectivePrice)}</strong>{hasActiveDiscount && <del>{money(price)}</del>}</div>;
}

export const fallbackImage = '/fragrance-placeholder.svg';
