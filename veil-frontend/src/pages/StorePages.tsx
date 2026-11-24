import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowRight, Check, Minus, Plus, ShoppingBag, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import api, { getErrorMessage } from '../lib/api';
import { useCart } from '../store/cart';
import type { Category, GiftPackage, Order, OrderStatus, Paginated, Product, StoreSettings } from '../types';
import { fallbackImage, money, Price } from '../components/Storefront';

const governorates = ['Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Gharbia', 'Dakahlia', 'Sharqia', 'Monufia', 'Kafr El Sheikh', 'Beheira', 'Damietta', 'Port Said', 'Ismailia', 'Suez', 'Fayoum', 'Beni Suef', 'Minya', 'Assiut', 'Sohag', 'Qena', 'Luxor', 'Aswan', 'Red Sea', 'New Valley', 'Matrouh', 'North Sinai', 'South Sinai'];

function ProductCard({ product, type = 'PRODUCT' }: { product: Product | GiftPackage; type?: 'PRODUCT' | 'PACKAGE' }) {
  const addItem = useCart((state) => state.addItem);
  const image = product.images[0] || fallbackImage;
  const fragrance = type === 'PRODUCT' ? product as Product : null;
  const giftSet = type === 'PACKAGE' ? product as GiftPackage : null;
  const inStock = fragrance ? fragrance.inStock : giftSet?.inStock || false;
  const firstAvailableVariant = fragrance?.variants.find((variant) => variant.isActive && variant.inStock);
  const subline = fragrance?.concentration || 'A considered gift, beautifully composed';
  const addToBag = () => {
    if (fragrance) {
      if (!firstAvailableVariant) return;
      addItem({
        itemType: 'PRODUCT',
        itemId: firstAvailableVariant.id,
        name: fragrance.name,
        slug: fragrance.slug,
        size: firstAvailableVariant.size,
        image,
        price: firstAvailableVariant.effectivePrice,
        maxStock: firstAvailableVariant.stock,
      });
    } else if (giftSet) {
      addItem({ itemType: 'PACKAGE', itemId: giftSet.id, name: giftSet.name, slug: giftSet.slug, image, price: giftSet.effectivePrice, maxStock: giftSet.availableStock });
    }
    toast.success(`${product.name} added to your bag`);
  };
  return (
    <article className="product-card">
      <Link to={type === 'PRODUCT' ? `/products/${product.slug}` : `/packages/${product.slug}`} className="product-image-wrap">
        <img src={image} alt={product.name} loading="lazy" />
        {product.hasActiveDiscount && <span className="sale-tag">A special trace</span>}
        {!inStock && <span className="soldout-tag">Currently unavailable</span>}
        <span className="card-arrow"><ArrowRight size={17} /></span>
      </Link>
      <div className="product-card-copy">
        <div className="product-card-description"><span className="product-kicker">{subline}</span><Link to={type === 'PRODUCT' ? `/products/${product.slug}` : `/packages/${product.slug}`}><h3>{product.name}</h3></Link><p>{product.description}</p>{fragrance && <div className="product-size-pills" aria-label="Available sizes">{fragrance.variants.filter((variant) => variant.isActive).map((variant) => <span key={variant.id}>{variant.size}</span>)}</div>}</div>
        {fragrance ? <div className="price-line"><strong>From {money(fragrance.startingPrice)}</strong>{fragrance.hasActiveDiscount && <span className="discount-note">Sale on selected sizes</span>}</div> : giftSet && <Price price={giftSet.price} effectivePrice={giftSet.effectivePrice} hasActiveDiscount={giftSet.hasActiveDiscount} />}
      </div>
      <button className="quick-add" disabled={!inStock} onClick={addToBag}><ShoppingBag size={15} /> {inStock ? 'Add to bag' : 'Out of stock'}</button>
    </article>
  );
}

function SectionHeading({ eyebrow, title, copy, link, to }: { eyebrow: string; title: string; copy?: string; link?: string; to?: string }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div>{link && to && <Link className="text-link" to={to}>{link} <ArrowRight size={15} /></Link>}</div>;
}

export function HomePage() {
  const products = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const featured = (await api.get<Paginated<Product>>('/products', { params: { isFeatured: true, limit: 4 } })) as unknown as Paginated<Product>;
      if (featured.items.length) return featured;
      return (await api.get<Paginated<Product>>('/products', { params: { limit: 4 } })) as unknown as Paginated<Product>;
    },
  });
  const packages = useQuery({
    queryKey: ['packages', 'featured'],
    queryFn: async () => {
      const featured = (await api.get<Paginated<GiftPackage>>('/packages', { params: { isFeatured: true, limit: 3 } })) as unknown as Paginated<GiftPackage>;
      if (featured.items.length) return featured;
      return (await api.get<Paginated<GiftPackage>>('/packages', { params: { limit: 3 } })) as unknown as Paginated<GiftPackage>;
    },
  });
  const heroFallback = useQuery({
    queryKey: ['products', 'hero-image'],
    queryFn: async () => (await api.get<Paginated<Product>>('/products', { params: { limit: 1 } })) as unknown as Paginated<Product>,
    enabled: products.isSuccess && !products.data.items.some((product) => product.images.length > 0),
  });
  const heroProduct = products.data?.items.find((product) => product.images.length > 0) || heroFallback.data?.items.find((product) => product.images.length > 0);
  return <>
    <section className="hero">
      <div className="hero-image">{heroProduct ? <img className="hero-product-image" src={heroProduct.images[0] || fallbackImage} alt={`${heroProduct.name} fragrance`} /> : <div className="hero-image-placeholder" aria-hidden="true"><span>VEIL</span><small>EAU DE PARFUM</small></div>}</div>
      <div className="hero-content container"><span className="eyebrow">THE ART OF BEING REMEMBERED</span><h1>Leave<em> a trace.</em></h1><p>Some moments are remembered by how they made us feel.<br />Find a fragrance that makes the moment yours.</p><Link className="button button-dark" to="/shop">Find your fragrance <ArrowRight size={16} /></Link><span className="hero-signature">A considered collection by Veil</span></div>
      <span className="hero-caption">VEIL · EAU DE PARFUM</span><a className="hero-scroll" href="#signature"><ArrowDown size={16} /> Scroll to discover</a>
    </section>
    <section className="container section-block" id="signature">
      <SectionHeading eyebrow="THE VEIL COLLECTION" title="Scent, with a soul." copy="A collection of distinctive compositions, each with its own character and a story only you can finish. Find the notes that feel like you." link="Explore all fragrances" to="/shop" />
      {products.isLoading ? <div className="loading-grid">{[1, 2, 3, 4].map((n) => <div className="skeleton" key={n} />)}</div> : products.isError ? <ErrorNote message="The collection could not be loaded." /> : products.data?.items.length ? <div className="product-grid">{products.data.items.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState text="Our signature collection is being prepared." />}
    </section>
    <section className="container story-band">
      <div className="story-image" aria-label="An original Veil fragrance still life"><span className="story-bottle-mark">VEIL <small>Nº 01</small></span></div>
      <div className="story-copy"><span className="eyebrow">A STUDY IN PRESENCE</span><h2>Some things are<br /><em>felt, not seen.</em></h2><p>Fragrance has a way of holding a moment. A bright first impression, a softer unfolding, a warmth that stays close. Veil invites you to find the composition that feels unmistakably your own.</p><div className="story-notes"><span><b>01</b> The first impression</span><span><b>02</b> The feeling that unfolds</span><span><b>03</b> The trace that remains</span></div><Link className="text-link" to="/shop">Discover the Veil point of view <ArrowRight size={15} /></Link></div>
    </section>
    <section className="container section-block gift-feature">
      <SectionHeading eyebrow="A GIFT THAT LINGERS" title="The art of giving." copy="For the moments words cannot quite hold. Explore considered fragrance pairings and choose a gift that feels personal, long after it is unwrapped." link="Discover gift sets" to="/packages" />
      {packages.isLoading ? <div className="loading-grid">{[1, 2, 3].map((n) => <div className="skeleton" key={n} />)}</div> : packages.isError ? <ErrorNote message="Gift sets are temporarily unavailable." /> : packages.data?.items.length ? <div className="product-grid product-grid-three">{packages.data.items.map((pkg) => <ProductCard key={pkg.id} product={pkg} type="PACKAGE" />)}</div> : <EmptyState text="Our gift collection is being prepared." />}
    </section>
    <section className="quote-band"><Sparkles size={20} /><p>“A fragrance is a memory in the making.”</p><span>THE VEIL PHILOSOPHY</span></section>
  </>;
}

function ErrorNote({ message }: { message: string }) {
  return <div className="inline-notice">{message}</div>;
}
function EmptyState({ text }: { text: string }) {
  return <div className="empty-state"><Sparkles size={24} /><p>{text}</p></div>;
}

export function ShopPage({ packagesOnly = false }: { packagesOnly?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const categorySlug = params.get('categorySlug') || '';
  const onSale = params.get('onSale') === 'true';
  const page = Number(params.get('page') || 1);
  const categories = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<Category[]>('/categories')) as unknown as Category[] });
  const query = useQuery({
    queryKey: [packagesOnly ? 'packages' : 'products', search, categorySlug, onSale, page],
    queryFn: async () => (await api.get<Paginated<Product | GiftPackage>>(packagesOnly ? '/packages' : '/products', { params: { ...(search && { search }), ...(!packagesOnly && categorySlug && { categorySlug }), ...(onSale && { onSale: true }), page, limit: 12 } })) as unknown as Paginated<Product | GiftPackage>,
  });
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  const data = query.data;
  return <section className="container catalog-page">
    <div className="page-intro"><span className="eyebrow">{packagesOnly ? 'A THOUGHTFUL GESTURE' : 'FIND YOUR SIGNATURE'}</span><h1>{packagesOnly ? <>The gift<br /><em>collection.</em></> : <>Fragrances<br /><em>with a feeling.</em></>}</h1><p>{packagesOnly ? 'Curated fragrance pairings, presented with intention.' : 'Explore distinctive compositions made to become part of your story.'}</p></div>
    <div className="catalog-tools">
      <form className="search-field" onSubmit={(event) => { event.preventDefault(); update('search', search.trim()); }}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or note..." aria-label="Search fragrances" /><button type="submit" aria-label="Submit search"><ArrowRight size={16} /></button></form>
      <label className={`sale-filter${onSale ? ' sale-filter-active' : ''}`}><input type="checkbox" checked={onSale} onChange={(event) => update('onSale', event.target.checked ? 'true' : '')} /> Special prices</label>
    </div>
    {!packagesOnly && <div className="category-chips" aria-label="Filter fragrances by collection">
      <button className={!categorySlug ? 'category-chip active' : 'category-chip'} aria-pressed={!categorySlug} onClick={() => update('categorySlug', '')} type="button">All fragrances</button>
      {categories.data?.map((category) => <button className={categorySlug === category.slug ? 'category-chip active' : 'category-chip'} aria-pressed={categorySlug === category.slug} key={category.id} onClick={() => update('categorySlug', category.slug)} type="button">{category.name}</button>)}
    </div>}
    <div className="catalog-count">{data ? `${data.meta.total} ${packagesOnly ? 'gift sets' : 'fragrances'}` : 'Curating the collection'}</div>
    {query.isLoading ? <div className="loading-grid">{[1, 2, 3, 4].map((n) => <div className="skeleton" key={n} />)}</div> : query.isError ? <ErrorNote message={getErrorMessage(query.error)} /> : data?.items.length ? <div className="product-grid">{data.items.map((product) => <ProductCard key={product.id} product={product} type={packagesOnly ? 'PACKAGE' : 'PRODUCT'} />)}</div> : <EmptyState text="Nothing here just yet. Try another search." />}
    {data && data.meta.totalPages > 1 && <div className="pagination"><button disabled={page <= 1} onClick={() => update('page', String(page - 1))}><ArrowLeft size={15} /> Previous</button><span>Page {page} of {data.meta.totalPages}</span><button disabled={page >= data.meta.totalPages} onClick={() => update('page', String(page + 1))}>Next <ArrowRight size={15} /></button></div>}
  </section>;
}

function ProductDetail({ isPackage = false }: { isPackage?: boolean }) {
  const { slug = '' } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const addItem = useCart((state) => state.addItem);
  const query = useQuery({
    queryKey: [isPackage ? 'package' : 'product', slug],
    queryFn: async () => (await api.get<Product | GiftPackage>(`/${isPackage ? 'packages' : 'products'}/${slug}`)) as unknown as Product | GiftPackage,
  });
  const navigate = useNavigate();
  if (query.isLoading) return <div className="container detail-loading"><div className="skeleton" /><div className="skeleton" /></div>;
  if (query.isError || !query.data) return <div className="container page-error"><h2>We couldn’t find this fragrance.</h2><Link className="text-link" to={isPackage ? '/packages' : '/shop'}>Back to the collection <ArrowRight size={15} /></Link></div>;
  const item = query.data;
  const product = isPackage ? null : item as Product;
  const giftSet = isPackage ? item as GiftPackage : null;
  const selectedVariant = product
    ? product.variants.find((variant) => variant.id === selectedVariantId)
      || product.variants.find((variant) => variant.isActive && variant.inStock)
      || product.variants[0]
    : undefined;
  const stock = product ? selectedVariant?.stock || 0 : giftSet?.availableStock || 0;
  const images = item.images.length ? item.images : [fallbackImage];
  const addToBag = () => {
    if (product && selectedVariant) {
      addItem({ itemType: 'PRODUCT', itemId: selectedVariant.id, name: product.name, slug: product.slug, size: selectedVariant.size, image: images[0], price: selectedVariant.effectivePrice, maxStock: selectedVariant.stock }, quantity);
    } else if (giftSet) {
      addItem({ itemType: 'PACKAGE', itemId: giftSet.id, name: giftSet.name, slug: giftSet.slug, image: images[0], price: giftSet.effectivePrice, maxStock: giftSet.availableStock }, quantity);
    }
    toast.success(`${item.name} added to your bag`);
  };
  return <section className="container detail-page">
    <div className="detail-gallery"><div className="main-product-image"><img src={images[selectedImage] || fallbackImage} alt={item.name} /></div><div className="thumbnail-row">{images.map((image, index) => <button className={index === selectedImage ? 'thumbnail active' : 'thumbnail'} onClick={() => setSelectedImage(index)} key={image}><img src={image} alt={`${item.name} view ${index + 1}`} /></button>)}</div></div>
    <div className="detail-copy">
      <span className="eyebrow">{isPackage ? 'THE GIFT COLLECTION' : product?.category?.name || 'VEIL FRAGRANCE'}</span>
      <h1>{item.name}</h1>
      {product && <span className="detail-subtitle">{product.concentration || 'Eau de parfum'}</span>}
      {product && <div className="variant-selector" aria-label="Select fragrance size"><span className="eyebrow">CHOOSE A SIZE</span><div className="variant-pills">{product.variants.map((variant) => {
        const unavailable = !variant.isActive || !variant.inStock;
        const selected = variant.id === selectedVariant?.id;
        return <button key={variant.id} type="button" className={`variant-pill${selected ? ' active' : ''}${unavailable ? ' unavailable' : ''}`} aria-pressed={selected} disabled={unavailable} onClick={() => { setSelectedVariantId(variant.id); setQuantity(1); }}>
          <span>{variant.size}</span><small>{unavailable ? 'Sold out' : money(variant.effectivePrice)}</small>
        </button>;
      })}</div></div>}
      {selectedVariant && <Price price={selectedVariant.price} effectivePrice={selectedVariant.effectivePrice} hasActiveDiscount={selectedVariant.hasActiveDiscount} />}
      {giftSet && <Price price={giftSet.price} effectivePrice={giftSet.effectivePrice} hasActiveDiscount={giftSet.hasActiveDiscount} />}
      <div className="detail-divider" />
      <p className="detail-description">{item.description}</p>
      {product && <FragranceNotes notes={product.notes} />}
      {giftSet && <div className="included-list"><h3>Inside the box</h3>{giftSet.items.map((included) => <div key={included.variantId}><span>{included.variant.product.name} <small>{included.variant.size}</small></span><b>× {included.quantity}</b></div>)}</div>}
      <div className="availability">{stock > 0 ? <><span className="stock-dot" /> In stock · {stock} available</> : <><span className="stock-dot out" /> Currently unavailable</>}</div>
      {stock > 0 && <div className="purchase-row"><div className="quantity-control quantity-large"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease"><Minus size={14} /></button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(stock, quantity + 1))} aria-label="Increase"><Plus size={14} /></button></div><button className="button button-dark" onClick={addToBag}><ShoppingBag size={16} /> Add to bag · {money((selectedVariant?.effectivePrice || giftSet?.effectivePrice || 0) * quantity)}</button></div>}
      <div className="detail-service"><div><Check size={15} /><span>Cash on delivery</span></div><div><Check size={15} /><span>Complimentary delivery over EGP 1,500</span></div></div>
      <button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back to collection</button>
    </div>
  </section>;
}

function FragranceNotes({ notes }: { notes?: Product['notes'] }) {
  if (!notes || (!notes.top && !notes.heart && !notes.base)) return null;
  return <div className="notes-card"><span className="eyebrow">THE FRAGRANCE PYRAMID</span><div className="note-row"><span>Top notes</span><p>{notes.top || '—'}</p></div><div className="note-row"><span>Heart notes</span><p>{notes.heart || '—'}</p></div><div className="note-row"><span>Base notes</span><p>{notes.base || '—'}</p></div></div>;
}

export function ProductPage() { return <ProductDetail />; }
export function PackagePage() { return <ProductDetail isPackage />; }

export function CheckoutPage() {
  const { items, clear } = useCart();
  const navigate = useNavigate();
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<StoreSettings>('/settings')) as unknown as StoreSettings });
  const settings = settingsQuery.data;
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const deliveryFee = settings
    ? settings.freeShippingThreshold !== null && subtotal >= settings.freeShippingThreshold
      ? 0
      : settings.defaultDeliveryFee
    : null;
  const orderTotal = deliveryFee === null ? null : subtotal + deliveryFee;
  const mutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => (await api.post<Order>('/orders', { ...payload, items: items.map(({ itemType, itemId, quantity }) => ({ itemType, itemId, quantity })) })) as unknown as Order,
    onSuccess: (order) => { clear(); navigate(`/order-success/${order.orderNumber}`, { state: { order } }); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) return;
    const data = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    data.forEach((value, key) => {
      payload[key] = String(value).trim();
    });
    if (payload.customerName.length < 2) {
      toast.error('Please enter your full name.');
      return;
    }
    if (payload.shippingAddress.length < 6) {
      toast.error('Please enter a complete delivery address.');
      return;
    }
    if (!payload.alternativePhone) delete payload.alternativePhone;
    if (!payload.customerEmail) delete payload.customerEmail;
    if (!payload.notes) delete payload.notes;
    mutation.mutate(payload);
  }
  if (!items.length) return <div className="container empty-checkout"><ShoppingBag size={30} /><h1>Your bag is taking a pause.</h1><p>Add a fragrance before continuing to checkout.</p><Link className="button button-dark" to="/shop">Explore fragrances <ArrowRight size={15} /></Link></div>;
  return <section className="container checkout-page">
    <div className="page-intro checkout-intro"><span className="eyebrow">A FEW DETAILS</span><h1>Make it <em>yours.</em></h1><p>We’ll prepare your order with care and deliver it to your door.</p></div>
    {settingsQuery.isLoading && <div className="inline-notice" role="status">Checking delivery availability…</div>}
    {settingsQuery.isError && <div className="inline-notice error-notice" role="alert">We couldn’t load delivery details. Please refresh the page before placing your order.</div>}
    {settings && !settings.isOpen && <div className="inline-notice" role="status">Our store is currently closed and cannot accept orders. Please check back soon.</div>}
    <div className="checkout-layout"><form className="checkout-form" onSubmit={submit}>
      <div className="form-section"><span className="step-number">01</span><div><h2>Your details</h2><p>So we know who to thank.</p></div></div>
      <div className="form-grid">
        <label className="field field-wide"><span className="field-heading">Full name</span><input name="customerName" autoComplete="name" required minLength={2} placeholder="Your name" /></label>
        <label className="field"><span className="field-heading">Mobile number</span><input name="customerPhone" type="tel" inputMode="tel" autoComplete="tel" required pattern="(\+20|20|0)?1[0125][0-9]{8}" title="Enter a valid Egyptian mobile number, for example 01012345678." placeholder="01XXXXXXXXX" /></label>
        <label className="field"><span className="field-heading">Alternative number <span className="optional-label">Optional</span></span><input name="alternativePhone" type="tel" inputMode="tel" pattern="(\+20|20|0)?1[0125][0-9]{8}" title="Enter a valid Egyptian mobile number, or leave this field empty." placeholder="01XXXXXXXXX" /></label>
        <label className="field field-wide"><span className="field-heading">Email address <span className="optional-label">Optional</span></span><input name="customerEmail" type="email" autoComplete="email" placeholder="you@example.com" /></label>
      </div>
      <div className="form-section section-spaced"><span className="step-number">02</span><div><h2>Delivery details</h2><p>Where should we leave your trace?</p></div></div>
      <div className="form-grid">
        <label className="field field-wide"><span className="field-heading">Governorate</span><select name="governorate" required defaultValue=""><option value="" disabled>Select governorate</option>{governorates.map((governorate) => <option key={governorate}>{governorate}</option>)}</select></label>
        <label className="field field-wide"><span className="field-heading">Full address</span><textarea name="shippingAddress" required minLength={6} rows={3} autoComplete="street-address" placeholder="Street, building, floor, apartment, and area" /></label>
        <label className="field field-wide"><span className="field-heading">Delivery note <span className="optional-label">Optional</span></span><textarea name="notes" rows={2} placeholder="A helpful note for our delivery team" /></label>
      </div>
      <button className="button button-dark button-full checkout-submit" type="submit" disabled={mutation.isPending || settingsQuery.isLoading || settingsQuery.isError || !settings?.isOpen}>{mutation.isPending ? 'Placing your order…' : <>Place COD order · {orderTotal === null ? '—' : money(orderTotal)} <ArrowRight size={16} /></>}</button>
      <p className="checkout-privacy"><Check size={14} /> Cash on delivery · No payment required now</p>
    </form>
    <aside className="order-summary"><span className="eyebrow">YOUR ORDER</span><h2>A considered choice.</h2><div className="summary-items">{items.map((item) => <div className="summary-item" key={`${item.itemType}-${item.itemId}`}><img src={item.image || fallbackImage} alt={item.name} /><div><b>{item.name}</b>{item.size && <small>{item.size}</small>}<span>Qty {item.quantity}</span></div><strong>{money(item.price * item.quantity)}</strong></div>)}</div><div className="summary-totals"><div className="summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="summary-row"><span>Delivery</span><strong>{deliveryFee === null ? '—' : deliveryFee ? money(deliveryFee) : 'Complimentary'}</strong></div>{deliveryFee !== null && deliveryFee > 0 && settings?.freeShippingThreshold && <p className="summary-hint">Complimentary delivery on orders over {money(settings.freeShippingThreshold)}.</p>}<div className="summary-row summary-total"><span>Total</span><strong>{orderTotal === null ? '—' : money(orderTotal)}</strong></div></div></aside></div>
  </section>;
}

const statusLabels: Record<OrderStatus, string> = { PENDING: 'Order received', CONFIRMED: 'Confirmed', SHIPPED: 'On its way', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' };

export function OrderSuccessPage() {
  const { orderNumber = '' } = useParams();
  return <section className="container success-page"><div className="success-icon"><Check size={26} /></div><span className="eyebrow">A TRACE HAS BEEN SET</span><h1>Thank you for<br /><em>choosing Veil.</em></h1><p>Your order is in good hands. We’ll be in touch soon to confirm delivery.</p><div className="order-number-card"><span>YOUR ORDER NUMBER</span><strong>{orderNumber}</strong></div><div className="success-actions"><Link className="button button-dark" to={`/track?orderNumber=${orderNumber}`}>Track your order <ArrowRight size={15} /></Link><Link className="text-link" to="/shop">Continue exploring</Link></div></section>;
}

export function TrackPage() {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const orderQuery = useQuery({
    queryKey: ['track-order', orderNumber, phone],
    queryFn: async () => (await api.get<Order>('/orders/track', { params: { orderNumber, phone } })) as unknown as Order,
    enabled: submitted && !!orderNumber && !!phone,
    retry: false,
  });
  const statusSequence: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
  const activeIndex = orderQuery.data ? statusSequence.indexOf(orderQuery.data.status) : -1;
  return <section className="container track-page">
    <div className="page-intro"><span className="eyebrow">EVERY STEP OF THE WAY</span><h1>Follow your<br /><em>fragrance.</em></h1><p>Your order number and mobile number are all we need.</p></div>
    <form className="track-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
      <label className="field">Order number<input required value={orderNumber} onChange={(event) => setOrderNumber(event.target.value.toUpperCase())} placeholder="VEIL-123456" /></label>
      <label className="field">Mobile number<input required type="tel" pattern="(\+20|20|0)?1[0125][0-9]{8}" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01XXXXXXXXX" /></label>
      <button className="button button-dark button-full" type="submit" disabled={orderQuery.isFetching}>{orderQuery.isFetching ? 'Finding your order…' : <>Track order <ArrowRight size={15} /></>}</button>
    </form>
    {orderQuery.isError && <div className="inline-notice error-notice">{getErrorMessage(orderQuery.error)}</div>}
    {orderQuery.data && <div className="tracking-result">
      <div className="tracking-heading"><div><span className="eyebrow">ORDER {orderQuery.data.orderNumber}</span><h2>{orderQuery.data.status === 'CANCELLED' ? 'This order was cancelled' : statusLabels[orderQuery.data.status]}</h2></div><span className={`status-pill status-${orderQuery.data.status.toLowerCase()}`}>{orderQuery.data.status}</span></div>
      {orderQuery.data.status === 'CANCELLED' ? <div className="inline-notice">For help with this order, please contact our team.</div> : <div className="status-stepper">{statusSequence.map((status, index) => <div className={`status-step ${index <= activeIndex ? 'complete' : ''} ${index === activeIndex ? 'current' : ''}`} key={status}><span>{index < activeIndex ? <Check size={14} /> : index + 1}</span><b>{statusLabels[status]}</b></div>)}</div>}
      <div className="tracking-items"><h3>Order details</h3>{orderQuery.data.items.map((item) => <div className="track-line" key={item.id}><span>{item.itemName} <small>× {item.quantity}</small></span><strong>{money(item.subtotal)}</strong></div>)}<div className="track-line"><span>Delivery</span><strong>{orderQuery.data.deliveryFee ? money(orderQuery.data.deliveryFee) : 'Complimentary'}</strong></div><div className="track-line total"><span>Total · Cash on delivery</span><strong>{money(orderQuery.data.total)}</strong></div></div>
      <p className="track-address">Delivering to {orderQuery.data.customerName} · {orderQuery.data.governorate}</p>
    </div>}
  </section>;
}
