import { ChangeEvent, FormEvent, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownRight, ArrowRight, Boxes, Check, ChevronDown, CircleDollarSign, ClipboardList, ImagePlus, LayoutDashboard, LogOut, Package, Search, Settings, ShoppingBag, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import api, { getErrorMessage } from '../lib/api';
import type { AdminUser, Category, CreatePackagePayload, CreateProductPayload, Customer, GiftPackage, Order, OrderStatus, OrderStats, Paginated, Product, ProductInfoInput, ProductVariant, ProductVariantInput, UpdatePackagePayload, UpdateProductPayload, StoreSettings } from '../types';
import { fallbackImage, money } from '../components/Storefront';
import { BrandLogo } from '../components/BrandLogo';
import { variantsApi } from '../api/variants.api';

const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/products', label: 'Fragrances', icon: ShoppingBag },
  { to: '/admin/packages', label: 'Gift sets', icon: Package },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminGate() {
  const token = localStorage.getItem('veil_admin_token');
  const profile = useQuery({ queryKey: ['admin-profile'], queryFn: async () => (await api.get<AdminUser>('/auth/me')) as unknown as AdminUser, enabled: !!token, retry: false });
  if (!token) return <Navigate to="/admin/login" replace />;
  if (profile.isLoading) return <div className="admin-loading"><span className="loader" /> Verifying access…</div>;
  if (profile.isError) {
    localStorage.removeItem('veil_admin_token');
    return <Navigate to="/admin/login" replace />;
  }
  return <AdminLayout user={profile.data} />;
}

function AdminLayout({ user }: { user?: AdminUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = () => {
    localStorage.removeItem('veil_admin_token');
    queryClient.clear();
    navigate('/admin/login');
    toast.success('You have been signed out');
  };
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link to="/" className="admin-brand" aria-label="Veil home"><BrandLogo compact /><span>ADMIN STUDIO</span></Link>
      <div className="admin-nav-label">WORKSPACE</div>
      <nav>{adminNav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}><Icon size={17} />{label}{label === 'Orders' && <span className="nav-indicator" />}</NavLink>)}</nav>
      <div className="admin-user"><div className="avatar">{(user?.name || 'V').slice(0, 1)}</div><div><b>{user?.name || 'Veil Admin'}</b><span>Store administrator</span></div><button onClick={logout} title="Sign out"><LogOut size={16} /></button></div>
    </aside>
    <main className="admin-main"><header className="admin-topbar"><div><span className="eyebrow">VEIL PERFUMES</span><span className="admin-top-caption">· Management studio</span></div><Link to="/" target="_blank" className="storefront-link">View storefront <ArrowRight size={14} /></Link></header><div className="admin-content"><Outlet /></div></main>
  </div>;
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useMutation({
    mutationFn: async () => (await api.post<{ accessToken: string; user: AdminUser }>('/auth/login', { email, password })) as unknown as { accessToken: string; user: AdminUser },
    onSuccess: (data) => { localStorage.setItem('veil_admin_token', data.accessToken); navigate('/admin', { replace: true }); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return <div className="login-page"><Link to="/" className="login-logo" aria-label="Veil home"><BrandLogo /></Link><form className="login-card" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}><span className="eyebrow">PRIVATE ACCESS</span><h1>Welcome <em>back.</em></h1><p>Sign in to your Veil management studio.</p><label className="field">Email address<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@veil.com" /></label><label className="field">Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /></label><button className="button button-dark button-full" disabled={mutation.isPending}>{mutation.isPending ? 'Signing in…' : <>Sign in <ArrowRight size={15} /></>}</button></form><span className="login-foot">VEIL · LEAVE A TRACE</span></div>;
}

export function AdminDashboardPage() {
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: async () => (await api.get<OrderStats>('/orders/stats')) as unknown as OrderStats });
  const orders = useQuery({ queryKey: ['admin-orders', 'recent'], queryFn: async () => (await api.get<Paginated<Order>>('/orders', { params: { page: 1, limit: 6 } })) as unknown as Paginated<Order> });
  const summary = stats.data;
  return <div className="admin-page"><AdminPageHeading eyebrow="MONDAY, MANAGED BEAUTIFULLY" title="Good to see you." copy="Here’s what’s happening with Veil today." />
    {stats.isError && <AdminError error={stats.error} />}
    <div className="kpi-grid">
      <KpiCard label="Total revenue" value={summary ? money(summary.totalRevenue) : '—'} icon={<CircleDollarSign />} detail="Excluding cancelled orders" />
      <KpiCard label="Total orders" value={summary?.totalOrders ?? '—'} icon={<ShoppingBag />} detail="All time" />
      <KpiCard label="Awaiting confirmation" value={summary?.byStatus.pending ?? '—'} icon={<ClipboardList />} detail="Pending orders" tone="olive" />
      <KpiCard label="On the way" value={summary?.byStatus.shipped ?? '—'} icon={<ArrowDownRight />} detail="Shipped to customers" tone="plum" />
    </div>
    <div className="admin-panel recent-orders"><div className="panel-heading"><div><span className="eyebrow">THE LATEST</span><h2>Recent orders</h2></div><Link to="/admin/orders" className="text-link">View all <ArrowRight size={14} /></Link></div>
      <OrdersTable orders={orders.data?.items || []} isLoading={orders.isLoading} compact />
      {orders.isError && <AdminError error={orders.error} />}
    </div>
    <div className="status-overview">{(['confirmed', 'shipped', 'delivered', 'cancelled'] as const).map((status) => <div key={status}><span className={`status-dot ${status}`} /><span>{status[0].toUpperCase() + status.slice(1)}</span><strong>{summary?.byStatus[status] ?? '—'}</strong></div>)}</div>
  </div>;
}

function AdminPageHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy?: string; action?: React.ReactNode }) {
  return <div className="admin-page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{copy && <p>{copy}</p>}</div>{action}</div>;
}

function KpiCard({ label, value, icon, detail, tone }: { label: string; value: React.ReactNode; icon: React.ReactNode; detail: string; tone?: string }) {
  return <div className="kpi-card"><div className={`kpi-icon ${tone || ''}`}>{icon}</div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function AdminError({ error }: { error: unknown }) {
  return <div className="inline-notice error-notice">{getErrorMessage(error)}</div>;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
}

function OrdersTable({ orders, isLoading, onSelect, compact = false }: { orders: Order[]; isLoading: boolean; onSelect?: (order: Order) => void; compact?: boolean }) {
  if (isLoading) return <div className="table-loading">Loading orders…</div>;
  if (!orders.length) return <div className="empty-table">No orders to show yet.</div>;
  return <div className="table-scroll"><table className="admin-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>TOTAL</th><th>STATUS</th>{!compact && <th />}</tr></thead><tbody>{orders.map((order) => <tr key={order.id} onClick={() => onSelect?.(order)} className={onSelect ? 'clickable-row' : ''}><td><b>{order.orderNumber}</b><small>{order.items.length} item{order.items.length === 1 ? '' : 's'}</small></td><td><b>{order.customerName}</b><small>{order.customerPhone}</small></td><td>{new Date(order.createdAt).toLocaleDateString('en-EG', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td><b>{money(order.total)}</b></td><td><StatusBadge status={order.status} /></td>{!compact && <td><ArrowRight size={15} /></td>}</tr>)}</tbody></table></div>;
}

export function AdminOrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);
  const [detail, setDetail] = useState<Order | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-orders', search, status, page], queryFn: async () => (await api.get<Paginated<Order>>('/orders', { params: { search: search || undefined, status: status || undefined, page, limit: 12 } })) as unknown as Paginated<Order> });
  const detailQuery = useQuery({ queryKey: ['admin-order', selected?.id], queryFn: async () => (await api.get<Order>(`/orders/${selected?.id}`)) as unknown as Order, enabled: !!selected });
  const update = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: OrderStatus }) => (await api.patch<Order>(`/orders/${id}/status`, { status: nextStatus })) as unknown as Order,
    onSuccess: (order) => { setDetail(order); queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); queryClient.invalidateQueries({ queryKey: ['admin-stats'] }); toast.success('Order status updated'); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const current = detail || detailQuery.data;
  return <div className="admin-page"><AdminPageHeading eyebrow="FULFILMENT" title="Orders" copy="Every order, from first confirmation to final delivery." />
    <div className="toolbar"><label className="admin-search"><Search size={16} /><input placeholder="Search order, name, or phone" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label><label className="admin-select"><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={14} /></label></div>
    <div className="admin-panel"><OrdersTable orders={query.data?.items || []} isLoading={query.isLoading} onSelect={(order) => { setSelected(order); setDetail(null); }} />{query.isError && <AdminError error={query.error} />}<Pagination page={page} meta={query.data?.meta} onChange={setPage} /></div>
    {selected && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><div className="admin-modal"><div className="modal-heading"><div><span className="eyebrow">ORDER DETAILS</span><h2>{current?.orderNumber || 'Loading…'}</h2></div><button className="icon-button" onClick={() => { setSelected(null); setDetail(null); }}><X /></button></div>
      {detailQuery.isLoading ? <div className="table-loading">Loading order details…</div> : current && <><div className="order-customer-block"><b>{current.customerName}</b><span>{current.customerPhone}{current.alternativePhone ? ` · Alt: ${current.alternativePhone}` : ''}</span><span>{current.governorate} · {current.shippingAddress}</span>{current.notes && <i>“{current.notes}”</i>}</div><div className="tracking-items">{current.items.map((item) => <div className="track-line" key={item.id}><span>{item.itemName} × {item.quantity}</span><strong>{money(item.subtotal)}</strong></div>)}</div><div className="summary-row modal-total"><span>Total · COD</span><strong>{money(current.total)}</strong></div><label className="field status-control">Update status<select value={current.status} disabled={current.status === 'CANCELLED' || update.isPending} onChange={(event) => { const next = event.target.value as OrderStatus; if (next === 'CANCELLED' && !window.confirm('Cancel this order? The products’ stock will be restored.')) return; update.mutate({ id: current.id, nextStatus: next }); }}><option value={current.status}>{current.status}</option>{(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as OrderStatus[]).filter((value) => value !== current.status).map((value) => <option key={value}>{value}</option>)}</select></label></>}
      {detailQuery.isError && <AdminError error={detailQuery.error} />}
    </div></div>}
  </div>;
}

function Pagination({ page, meta, onChange }: { page: number; meta?: { totalPages: number; total: number }; onChange: (page: number) => void }) {
  if (!meta || meta.totalPages < 2) return null;
  return <div className="pagination admin-pagination"><span>{meta.total} results · Page {page} of {meta.totalPages}</span><div><button disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><button disabled={page >= meta.totalPages} onClick={() => onChange(page + 1)}>Next</button></div></div>;
}

function ImageUploader({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is larger than 5MB`);
        if (!/image\/(jpeg|png|webp)/.test(file.type)) throw new Error(`${file.name} must be JPG, PNG, or WebP`);
        const formData = new FormData();
        formData.append('file', file);
        const uploaded = (await api.post<{ url: string }>('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } })) as unknown as { url: string };
        urls.push(uploaded.url);
      }
      onChange([...images, ...urls]);
      toast.success(`${urls.length} image${urls.length === 1 ? '' : 's'} uploaded`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }
  return <div className="image-uploader"><div className="uploaded-images">{images.map((image, index) => <div key={`${image}-${index}`}><img src={image} alt={`Uploaded product ${index + 1}`} /><button type="button" onClick={() => onChange(images.filter((_, imageIndex) => index !== imageIndex))} aria-label="Remove image"><X size={13} /></button></div>)}
    <label className="upload-button"><ImagePlus size={19} /><span>{uploading ? 'Uploading…' : 'Add image'}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} disabled={uploading} /></label></div><small>JPG, PNG or WebP · 5MB maximum per image</small></div>;
}

export function AdminCatalogPage({ packages = false }: { packages?: boolean }) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Product | GiftPackage | null>(null);
  const queryClient = useQueryClient();
  const endpoint = packages ? '/packages' : '/products';
  const query = useQuery({ queryKey: ['admin-catalog', packages, search, activeFilter], queryFn: async () => (await api.get<Paginated<Product | GiftPackage>>(`${endpoint}/admin`, { params: { search: search || undefined, isActive: activeFilter || undefined, limit: 50 } })) as unknown as Paginated<Product | GiftPackage> });
  const remove = useMutation({ mutationFn: async (id: string) => api.delete(`${endpoint}/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-catalog'] }); toast.success(`${packages ? 'Gift set' : 'Fragrance'} deleted`); }, onError: (error) => toast.error(getErrorMessage(error)) });
  const title = packages ? 'Gift sets' : 'Fragrances';
  const openEditor = (item: Product | GiftPackage | null) => { setEditing(item); setEditorOpen(true); };
  return <div className="admin-page"><AdminPageHeading eyebrow="THE VEIL COLLECTION" title={title} copy={`Curate the ${packages ? 'gift sets' : 'fragrances'} available in your store.`} action={<button className="button button-dark" onClick={() => openEditor(null)}><span>+</span> Add {packages ? 'gift set' : 'fragrance'}</button>} />
    <div className="toolbar"><label className="admin-search"><Search size={16} /><input placeholder={`Search ${title.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="admin-select"><select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}><option value="">All visibility</option><option value="true">Active</option><option value="false">Inactive</option></select><ChevronDown size={14} /></label></div>
    <div className="admin-panel catalog-admin-panel">{query.isLoading ? <div className="table-loading">Loading the collection…</div> : query.data?.items.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th>ITEM</th><th>PRICE</th>{!packages && <th>SIZES</th>}<th>STOCK</th><th>FEATURED</th><th>VISIBILITY</th><th /></tr></thead><tbody>{query.data.items.map((item) => {
      const fragrance = packages ? null : item as Product;
      const giftSet = packages ? item as GiftPackage : null;
      const itemStock = fragrance ? fragrance.variants.reduce((total, variant) => total + (variant.isActive ? variant.stock : 0), 0) : giftSet?.availableStock || 0;
      const startingPrice = fragrance?.startingPrice ?? giftSet?.effectivePrice ?? 0;
      const hasDiscount = fragrance?.hasActiveDiscount ?? giftSet?.hasActiveDiscount ?? false;
      const originalStartingPrice = fragrance?.variants.filter((variant) => variant.isActive).reduce((lowest, variant) => Math.min(lowest, variant.price), Number.POSITIVE_INFINITY);
      return <tr key={item.id}><td><div className="catalog-item-cell"><img src={item.images[0] || fallbackImage} alt="" /><div><b>{item.name}</b><small>/{item.slug}</small></div></div></td><td><b>{fragrance ? `From ${money(startingPrice)}` : money(startingPrice)}</b>{hasDiscount && <small className="old-price">{money(fragrance ? originalStartingPrice || startingPrice : giftSet?.price || startingPrice)}</small>}</td>{fragrance && <td><span className="size-count">{fragrance.variants.length} sizes</span></td>}<td><span className={itemStock <= 5 ? 'low-stock' : ''}>{itemStock} {itemStock <= 5 && <small>Low</small>}</span></td><td>{item.isFeatured ? 'Yes' : '—'}</td><td><span className={`visibility ${item.isActive ? 'active' : ''}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td><td><div className="table-actions"><button onClick={() => openEditor(item)}>Edit</button><button className="delete-action" onClick={() => { if (window.confirm(`Permanently delete ${item.name}?`)) remove.mutate(item.id); }}>Delete</button></div></td></tr>;
    })}</tbody></table></div> : <div className="empty-table">No {title.toLowerCase()} found.</div>}
    {query.isError && <AdminError error={query.error} />}</div>
    {editorOpen && (packages ? <PackageEditor item={editing as GiftPackage | null} onClose={() => setEditorOpen(false)} /> : <ProductEditor item={editing as Product | null} onClose={() => setEditorOpen(false)} />)}
  </div>;
}

function ProductEditor({ item, onClose }: { item: Product | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['categories', 'admin'], queryFn: async () => (await api.get<Category[]>('/categories', { params: { includeInactive: true } })) as unknown as Category[] });
  const [images, setImages] = useState(item?.images || []);
  const [notes, setNotes] = useState(item?.notes || {});
  const [variants, setVariants] = useState<VariantDraft[]>(item?.variants.map(toVariantDraft) || [emptyVariantDraft()]);
  const refreshCatalog = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-catalog'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['packages'] });
    queryClient.invalidateQueries({ queryKey: ['admin-products-options'] });
  };
  const createProduct = useMutation({
    mutationFn: async (payload: CreateProductPayload) => (await api.post<Product>('/products', payload)) as unknown as Product,
    onSuccess: () => { refreshCatalog(); toast.success('Fragrance created'); onClose(); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const updateProduct = useMutation({
    mutationFn: async (payload: UpdateProductPayload) => (await api.patch<Product>(`/products/${item?.id}`, payload)) as unknown as Product,
    onSuccess: () => { refreshCatalog(); toast.success('Fragrance details saved'); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const createVariant = useMutation({
    mutationFn: async (draft: VariantDraft) => variantsApi.createVariant({ ...toVariantPayload(draft), productId: item?.id || '' }),
    onSuccess: (variant, submittedDraft) => { setVariants((current) => current.map((draft) => draft === submittedDraft ? toVariantDraft(variant) : draft)); refreshCatalog(); toast.success(`${variant.size} size added`); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const updateVariant = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: VariantDraft }) => variantsApi.updateVariant(id, toVariantPayload(draft)),
    onSuccess: (variant) => { setVariants((current) => current.map((draft) => draft.id === variant.id ? toVariantDraft(variant) : draft)); refreshCatalog(); toast.success(`${variant.size} size updated`); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const deleteVariant = useMutation({
    mutationFn: variantsApi.deleteVariant,
    onSuccess: (_, id) => { setVariants((current) => current.filter((draft) => draft.id !== id)); refreshCatalog(); toast.success('Size removed'); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const variantMutationPending = createVariant.isPending || updateVariant.isPending || deleteVariant.isPending;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    const info: ProductInfoInput = {
      name: String(data.name).trim(), description: String(data.description).trim(),
      categoryId: String(data.categoryId), images,
      concentration: String(data.concentration || ''),
      notes: { top: notes.top || undefined, heart: notes.heart || undefined, base: notes.base || undefined },
      isFeatured: data.isFeatured === 'on', isActive: data.isActive === 'on',
    };
    if (images.length === 0) { toast.error('Upload at least one product image'); return; }
    if (item) {
      updateProduct.mutate(info);
      return;
    }
    const validationMessage = validateVariantDrafts(variants);
    if (validationMessage) { toast.error(validationMessage); return; }
    createProduct.mutate({ ...info, variants: variants.map(toVariantPayload) });
  }
  function addVariantDraft() {
    setVariants((current) => [...current, emptyVariantDraft()]);
  }
  function submitVariant(draft: VariantDraft) {
    const validationMessage = validateVariantDrafts([draft]);
    if (validationMessage) { toast.error(validationMessage); return; }
    if (draft.id) updateVariant.mutate({ id: draft.id, draft });
    else if (item) createVariant.mutate(draft);
  }
  function removeVariant(draft: VariantDraft) {
    if (!draft.id) {
      if (!item && variants.length <= 1) { toast.error('A fragrance needs at least one size'); return; }
      setVariants((current) => current.filter((variant) => variant !== draft));
      return;
    }
    if (variants.filter((variant) => variant.id).length <= 1) { toast.error('A fragrance needs at least one saved size'); return; }
    if (window.confirm(`Remove the ${draft.size} size?`)) deleteVariant.mutate(draft.id);
  }
  return <EditorModal title={item ? 'Edit fragrance' : 'New fragrance'} onClose={onClose}>
    <form className="editor-form" onSubmit={submit}>
      <div className="editor-section-head"><span className="step-number">01</span><div><h3>Fragrance details</h3><p>Name, story and collection placement.</p></div></div>
      <div className="form-grid"><label className="field field-wide">Fragrance name<input required name="name" defaultValue={item?.name} /></label><label className="field field-wide">Description<textarea required name="description" rows={3} defaultValue={item?.description} /></label><label className="field">Concentration<input name="concentration" placeholder="Eau de Parfum" defaultValue={item?.concentration || ''} /></label><label className="field field-wide">Category<select required name="categoryId" defaultValue={item?.categoryId || ''}><option value="" disabled>Select category</option>{categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>
      <div className="editor-subheading">Fragrance notes <span>Optional</span></div><div className="form-grid"><label className="field">Top notes<input value={notes.top || ''} onChange={(event) => setNotes({ ...notes, top: event.target.value })} /></label><label className="field">Heart notes<input value={notes.heart || ''} onChange={(event) => setNotes({ ...notes, heart: event.target.value })} /></label><label className="field field-wide">Base notes<input value={notes.base || ''} onChange={(event) => setNotes({ ...notes, base: event.target.value })} /></label></div>
      <div className="editor-subheading">Product images</div><ImageUploader images={images} onChange={setImages} /><ToggleFields featured={item?.isFeatured} active={item?.isActive} />
      {!item && <div className="variant-builder"><div className="editor-subheading"><span>02 · Sizes & pricing</span><button type="button" className="add-variant-button" onClick={addVariantDraft}>+ Add size</button></div><p className="variant-helper">Set a separate price and stock level for each bottle size.</p>{variants.map((variant, index) => <VariantDraftFields key={variant.id || `new-${index}`} draft={variant} index={index} onChange={(next) => setVariants((current) => current.map((entry, entryIndex) => entryIndex === index ? next : entry))} onRemove={() => removeVariant(variant)} removable={variants.length > 1} />)}</div>}
      <EditorActions onClose={onClose} pending={item ? updateProduct.isPending : createProduct.isPending} submitText={item ? 'Save product details' : 'Create fragrance'} />
    </form>
    {item && <section className="variant-manager"><div className="editor-section-head"><span className="step-number">02</span><div><h3>Manage sizes</h3><p>Each size has its own price, discount and stock.</p></div></div>{variants.map((variant, index) => <VariantDraftFields key={variant.id || `new-${index}`} draft={variant} index={index} onChange={(next) => setVariants((current) => current.map((entry, entryIndex) => entryIndex === index ? next : entry))} onRemove={() => removeVariant(variant)} removable={variants.length > 1} disabled={variantMutationPending} actions={<div className="variant-row-actions">{variant.id ? <button type="button" className="button button-light" onClick={() => submitVariant(variant)} disabled={variantMutationPending}>{updateVariant.isPending ? 'Saving…' : 'Save size'}</button> : <button type="button" className="button button-dark" onClick={() => submitVariant(variant)} disabled={variantMutationPending}>{createVariant.isPending ? 'Adding…' : 'Add size'}</button>}</div>} />)}<button type="button" className="add-variant-button add-variant-wide" onClick={addVariantDraft} disabled={variantMutationPending}>+ Add another size</button></section>}
  </EditorModal>;
}

function PackageEditor({ item, onClose }: { item: GiftPackage | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const products = useQuery({ queryKey: ['admin-products-options'], queryFn: async () => (await api.get<Paginated<Product>>('/products/admin', { params: { limit: 100 } })) as unknown as Paginated<Product> });
  const [images, setImages] = useState(item?.images || []);
  const [contents, setContents] = useState<{ variantId: string; quantity: number }[]>(item?.items.map((entry) => ({ variantId: entry.variantId, quantity: entry.quantity })) || []);
  const mutation = useMutation({
    mutationFn: async (payload: CreatePackagePayload | UpdatePackagePayload) => item ? api.patch(`/packages/${item.id}`, payload) : api.post('/packages', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-catalog'] }); queryClient.invalidateQueries({ queryKey: ['packages'] }); toast.success(item ? 'Gift set updated' : 'Gift set created'); onClose(); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    if (!contents.length) { toast.error('Add at least one fragrance to this gift set'); return; }
    if (!images.length) { toast.error('Upload at least one gift set image'); return; }
    mutation.mutate({ name: String(data.name), description: String(data.description), price: Number(data.price), discountPrice: data.discountPrice ? Number(data.discountPrice) : item?.discountPrice ? null : undefined, discountExpiresAt: data.discountExpiresAt ? new Date(String(data.discountExpiresAt)).toISOString() : item?.discountExpiresAt ? null : undefined, images, items: contents, isFeatured: data.isFeatured === 'on', isActive: data.isActive === 'on' });
  }
  const allVariants = products.data?.items.flatMap((product) => product.variants.map((variant) => ({ product, variant }))) || [];
  const availableVariants = allVariants.filter(({ product, variant }) => product.isActive && variant.isActive);
  function addVariant() {
    const available = availableVariants.find(({ variant }) => !contents.some((entry) => entry.variantId === variant.id));
    if (available) setContents((current) => [...current, { variantId: available.variant.id, quantity: 1 }]);
    else toast.error('All active fragrance sizes have been added');
  }
  return <EditorModal title={item ? 'Edit gift set' : 'New gift set'} onClose={onClose}><form className="editor-form" onSubmit={submit}>
    <div className="form-grid"><label className="field field-wide">Gift set name<input required name="name" defaultValue={item?.name} /></label><label className="field field-wide">Description<textarea required name="description" rows={3} defaultValue={item?.description} /></label><label className="field">Price (EGP)<input required type="number" min="1" step="0.01" name="price" defaultValue={item?.price} /></label><label className="field">Discount price<input type="number" min="1" step="0.01" name="discountPrice" defaultValue={item?.discountPrice || ''} /></label><label className="field field-wide">Discount expiry<input type="datetime-local" name="discountExpiresAt" defaultValue={item?.discountExpiresAt ? item.discountExpiresAt.slice(0, 16) : ''} /></label></div>
    <div className="editor-subheading">Included sizes <button className="text-link" type="button" onClick={addVariant}>+ Add size</button></div>
    {contents.map((entry, index) => <div className="package-item-editor" key={`${entry.variantId}-${index}`}><select required value={entry.variantId} onChange={(event) => setContents((current) => current.map((line, currentIndex) => currentIndex === index ? { ...line, variantId: event.target.value } : line))}><option value="" disabled>Select a fragrance size</option>{allVariants.map(({ product, variant }) => <option key={variant.id} value={variant.id} disabled={!product.isActive || !variant.isActive || contents.some((other, otherIndex) => otherIndex !== index && other.variantId === variant.id)}>{product.name} — {variant.size} ({variant.stock} in stock)</option>)}</select><label>Qty<input aria-label={`Quantity of included ${entry.variantId}`} type="number" min="1" value={entry.quantity} onChange={(event) => setContents((current) => current.map((line, currentIndex) => currentIndex === index ? { ...line, quantity: Math.max(1, Number(event.target.value)) } : line))} /></label><button type="button" aria-label="Remove included size" onClick={() => setContents((current) => current.filter((_, currentIndex) => currentIndex !== index))}><X size={15} /></button></div>)}
    {products.isError && <AdminError error={products.error} />}
    {!products.isLoading && !availableVariants.length && <div className="inline-notice">Add an active fragrance size before building a gift set.</div>}
    <div className="editor-subheading">Images</div><ImageUploader images={images} onChange={setImages} /><ToggleFields featured={item?.isFeatured} active={item?.isActive} /><EditorActions onClose={onClose} pending={mutation.isPending} />
  </form></EditorModal>;
}

type VariantDraft = Omit<ProductVariantInput, 'price' | 'discountPrice' | 'discountExpiresAt' | 'stock'> & {
  id?: string;
  price: string;
  discountPrice: string;
  discountExpiresAt: string;
  stock: string;
};

function emptyVariantDraft(): VariantDraft {
  return { size: '', price: '', discountPrice: '', discountExpiresAt: '', stock: '0', isActive: true };
}

function toVariantDraft(variant: ProductVariant): VariantDraft {
  return {
    id: variant.id,
    size: variant.size,
    price: String(variant.price),
    discountPrice: variant.discountPrice === null ? '' : String(variant.discountPrice),
    discountExpiresAt: variant.discountExpiresAt ? new Date(variant.discountExpiresAt).toISOString().slice(0, 16) : '',
    stock: String(variant.stock),
    isActive: variant.isActive,
  };
}

function validateVariantDrafts(drafts: VariantDraft[]): string | null {
  if (!drafts.length) return 'Add at least one size before saving the fragrance.';
  const sizes = new Set<string>();
  for (const draft of drafts) {
    const size = draft.size.trim();
    const price = Number(draft.price);
    const discount = draft.discountPrice.trim() ? Number(draft.discountPrice) : null;
    const stock = Number(draft.stock);
    if (!size) return 'Enter a size such as 30ml or 50ml.';
    if (sizes.has(size.toLowerCase())) return `The size "${size}" is listed more than once.`;
    sizes.add(size.toLowerCase());
    if (!Number.isFinite(price) || price < 1) return `Enter a valid price for ${size}.`;
    if (discount !== null && (!Number.isFinite(discount) || discount < 1 || discount >= price)) return `The discount for ${size} must be lower than its price.`;
    if (!Number.isInteger(stock) || stock < 0) return `Enter a valid stock quantity for ${size}.`;
  }
  return null;
}

function toVariantPayload(draft: VariantDraft): ProductVariantInput {
  return {
    size: draft.size.trim(),
    price: Number(draft.price),
    discountPrice: draft.discountPrice.trim() ? Number(draft.discountPrice) : null,
    discountExpiresAt: draft.discountExpiresAt ? new Date(draft.discountExpiresAt).toISOString() : null,
    stock: Number(draft.stock),
    isActive: draft.isActive,
  };
}

function VariantDraftFields({ draft, index, onChange, onRemove, removable, disabled, actions }: {
  draft: VariantDraft;
  index: number;
  onChange: (draft: VariantDraft) => void;
  onRemove: () => void;
  removable: boolean;
  disabled?: boolean;
  actions?: React.ReactNode;
}) {
  function change<K extends keyof VariantDraft>(key: K, value: VariantDraft[K]) {
    onChange({ ...draft, [key]: value });
  }
  return <article className="variant-editor-card">
    <div className="variant-card-heading"><div><span className="variant-index">SIZE {String(index + 1).padStart(2, '0')}</span><strong>{draft.size || 'New size'}</strong></div>{removable && <button type="button" className="variant-remove" onClick={onRemove} disabled={disabled} aria-label={`Remove ${draft.size || 'size'}`}><X size={16} /></button>}</div>
    <div className="variant-fields">
      <label className="field">Size<input required disabled={disabled} value={draft.size} onChange={(event) => change('size', event.target.value)} placeholder="50ml" /></label>
      <label className="field">Price (EGP)<input required disabled={disabled} type="number" inputMode="decimal" min="1" step="0.01" value={draft.price} onChange={(event) => change('price', event.target.value)} placeholder="950" /></label>
      <label className="field">Sale price <span className="optional-label">Optional</span><input disabled={disabled} type="number" inputMode="decimal" min="1" step="0.01" value={draft.discountPrice} onChange={(event) => change('discountPrice', event.target.value)} placeholder="—" /></label>
      <label className="field">Sale ends <span className="optional-label">Optional</span><input disabled={disabled} type="datetime-local" value={draft.discountExpiresAt} onChange={(event) => change('discountExpiresAt', event.target.value)} /></label>
      <label className="field">Stock<input required disabled={disabled} type="number" inputMode="numeric" min="0" step="1" value={draft.stock} onChange={(event) => change('stock', event.target.value)} /></label>
      <label className="variant-active-toggle"><input type="checkbox" disabled={disabled} checked={draft.isActive} onChange={(event) => change('isActive', event.target.checked)} /><span>Available for sale</span></label>
    </div>
    {actions}
  </article>;
}

function ToggleFields({ featured = false, active = true }: { featured?: boolean; active?: boolean }) {
  return <div className="toggle-fields"><label><input type="checkbox" name="isFeatured" defaultChecked={featured} /> Featured on storefront</label><label><input type="checkbox" name="isActive" defaultChecked={active} /> Active and available</label></div>;
}

function EditorModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="admin-modal editor-modal"><div className="modal-heading"><div><span className="eyebrow">COLLECTION MANAGEMENT</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X /></button></div>{children}</div></div>;
}
function EditorActions({ onClose, pending, submitText = 'Save changes' }: { onClose: () => void; pending: boolean; submitText?: string }) {
  return <div className="editor-actions"><button type="button" className="button button-light" onClick={onClose}>Cancel</button><button type="submit" className="button button-dark" disabled={pending}>{pending ? 'Saving…' : <>{submitText} <Check size={15} /></>}</button></div>;
}

export function AdminCustomersPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const query = useQuery({ queryKey: ['admin-customers', search], queryFn: async () => (await api.get<Paginated<Customer>>('/customers', { params: { search: search || undefined, limit: 50 } })) as unknown as Paginated<Customer> });
  const profile = useQuery({ queryKey: ['admin-customer', selected?.id], queryFn: async () => (await api.get<Customer>(`/customers/${selected?.id}`)) as unknown as Customer, enabled: !!selected });
  const current = profile.data || selected;
  return <div className="admin-page"><AdminPageHeading eyebrow="RELATIONSHIPS" title="Customers" copy="The people who have made Veil part of their story." />
    <div className="toolbar"><label className="admin-search"><Search size={16} /><input placeholder="Search name, phone, or email" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
    <div className="admin-panel">{query.isLoading ? <div className="table-loading">Loading customers…</div> : query.data?.items.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th>CUSTOMER</th><th>CONTACT</th><th>ORDERS</th><th>JOINED</th><th /></tr></thead><tbody>{query.data.items.map((customer) => <tr key={customer.id} onClick={() => setSelected(customer)} className="clickable-row"><td><div className="customer-cell"><div className="avatar">{customer.name.charAt(0)}</div><b>{customer.name}</b></div></td><td><b>{customer.phone}</b><small>{customer.email || '—'}</small></td><td>{customer._count?.orders || 0}</td><td>{new Date(customer.createdAt).toLocaleDateString('en-EG', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td><ArrowRight size={15} /></td></tr>)}</tbody></table></div> : <div className="empty-table">No customers found.</div>}{query.isError && <AdminError error={query.error} />}</div>
    {selected && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><div className="admin-modal customer-modal"><div className="modal-heading"><div><span className="eyebrow">CUSTOMER PROFILE</span><h2>{current?.name || 'Loading…'}</h2></div><button className="icon-button" onClick={() => setSelected(null)}><X /></button></div>{profile.isLoading ? <div className="table-loading">Loading profile…</div> : current && <><div className="customer-contact"><span>{current.phone}</span><span>{current.email || 'No email provided'}</span><span>{current.address || 'No address on file'}</span></div><div className="customer-stats"><div><span>Lifetime spend</span><b>{money(current.stats?.totalSpent || 0)}</b></div><div><span>Total orders</span><b>{current.stats?.totalOrders || 0}</b></div></div><h3 className="customer-history-title">Order history</h3>{current.orders?.length ? current.orders.map((order) => <div className="customer-order" key={order.id}><div><b>{order.orderNumber}</b><span>{new Date(order.createdAt).toLocaleDateString('en-EG')}</span></div><StatusBadge status={order.status} /><strong>{money(order.total)}</strong></div>) : <div className="empty-table">No orders on record.</div>}</>}{profile.isError && <AdminError error={profile.error} />}</div></div>}
  </div>;
}

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<StoreSettings>('/settings')) as unknown as StoreSettings });
  const mutation = useMutation({ mutationFn: async (payload: Partial<StoreSettings>) => (await api.patch<StoreSettings>('/settings', payload)) as unknown as StoreSettings, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); toast.success('Store settings saved'); }, onError: (error) => toast.error(getErrorMessage(error)) });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) || '');
    mutation.mutate({ storeName: value('storeName'), phone: value('phone'), whatsapp: value('whatsapp'), instagramUrl: value('instagramUrl') || null, facebookUrl: value('facebookUrl') || null, defaultDeliveryFee: Number(value('defaultDeliveryFee')), freeShippingThreshold: value('freeShippingThreshold') === '' ? null : Number(value('freeShippingThreshold')), isOpen: form.get('isOpen') === 'on' });
  }
  const store = settings.data;
  return <div className="admin-page"><AdminPageHeading eyebrow="THE HOUSE RULES" title="Store settings" copy="Keep the details of your Veil experience up to date." />{settings.isError && <AdminError error={settings.error} />}
    {store && <form className="admin-panel settings-form" onSubmit={submit}><div className="settings-section-head"><div className="settings-symbol"><Settings size={19} /></div><div><h2>Store profile</h2><p>Your public contact details and social presence.</p></div></div><div className="form-grid"><label className="field field-wide">Store name<input name="storeName" defaultValue={store.storeName} /></label><label className="field">Phone<input name="phone" defaultValue={store.phone || ''} placeholder="+201XXXXXXXXX" /></label><label className="field">WhatsApp<input name="whatsapp" defaultValue={store.whatsapp || ''} placeholder="+201XXXXXXXXX" /></label><label className="field">Instagram URL<input type="url" name="instagramUrl" defaultValue={store.instagramUrl || ''} /></label><label className="field">Facebook URL<input type="url" name="facebookUrl" defaultValue={store.facebookUrl || ''} /></label></div><div className="settings-divider" /><div className="settings-section-head"><div className="settings-symbol olive"><Boxes size={19} /></div><div><h2>Delivery & availability</h2><p>Set delivery pricing and decide when the store is open.</p></div></div><div className="form-grid"><label className="field">Default delivery fee (EGP)<input required type="number" name="defaultDeliveryFee" min="0" step="0.01" defaultValue={store.defaultDeliveryFee} /></label><label className="field">Free delivery threshold (EGP)<span>Leave blank to disable</span><input type="number" name="freeShippingThreshold" min="0" step="0.01" defaultValue={store.freeShippingThreshold ?? ''} /></label></div><label className="store-open-toggle"><input type="checkbox" name="isOpen" defaultChecked={store.isOpen} /><span><b>Store is open</b><small>Customers can place new orders while the store is open.</small></span><i className={store.isOpen ? 'open' : ''}>{store.isOpen ? 'OPEN' : 'CLOSED'}</i></label><div className="settings-actions"><span>Changes are visible to customers immediately.</span><button className="button button-dark" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : <>Save settings <Check size={15} /></>}</button></div></form>}
  </div>;
}
