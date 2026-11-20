# Veil — E-Commerce Backend & System Documentation

**Veil** is a streamlined, modern e-commerce platform tailored for a niche perfume brand. The system is designed to be lightweight, fast, and easy to manage by a single store administrator, while offering customers a smooth shopping experience including individual perfumes, promotional discounts, and curated multi-perfume gift boxes (**Packages**).

---

## Tech Stack & Architectural Decisions

- **Backend Framework:** NestJS (Node.js / TypeScript)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication & Authorization:** JWT + Role-Based Guard (`ADMIN`, `CUSTOMER`)
- **File Storage:** Cloudinary / AWS S3 (for product & package imagery)
- **API Documentation:** Swagger / OpenAPI (used to seamlessly generate/connect the React frontend via AI Agent)
- **Frontend:** React + Vite (Single Page Application)

### Why React (SPA) for the Frontend?

- **Instant Navigation & Performance:** Unlike traditional multi-page apps that reload the entire page on every click, a React SPA loads core assets once and fetches lightweight JSON payloads from the NestJS API. Using **Route-based Code Splitting (`React.lazy`)**, the initial bundle stays small and fast.
- **Zero Server Overhead & Easy Hosting:** Compiles into static files that can be hosted for free on Vercel, Netlify, or Cloudflare Pages, keeping infrastructure costs near zero while social media traffic (Instagram/TikTok ads) lands directly on product/package links.
- _(Note: If organic Google SEO becomes a primary requirement later, the API-first architecture allows migrating the storefront to Next.js without changing a single line of backend code.)_

---

## Core Domain Features

### 1. Simple Role-Based Access Control (RBAC)

No complex permission matrices. The system relies on two strict roles:

- **`ADMIN`**: Full access to manage categories, perfumes, discounts, packages, and customer orders.
- **`CUSTOMER`**: Can browse catalog, manage shopping cart, place orders, and view order history.

### 2. Perfumes & Dynamic Discounts (`Product`)

Each perfume supports:

- **Base Information:** Name, slug, description, bottle size (e.g., `50ml`, `100ml`), fragrance notes (Top, Heart, Base), and multiple images.
- **Inventory Tracking:** `stock` count automatically decremented upon checkout.
- **Flexible Discount System:**
  - `price`: Original retail price.
  - `discountPrice` (optional): The final price after discount, paired with an optional `discountExpiresAt` timestamp so time-limited offers expire automatically without manual intervention.

### 3. Perfume Packages / Gift Boxes (`Package`)

A dedicated entity allowing the admin to bundle multiple perfumes into a single box (e.g., _"Veil Discovery Set"_ or _"Him & Her Bundle"_):

- **Bundle Composition:** Links to multiple `Product` items with specific quantities (e.g., 1x Midnight Oud + 1x Velvet Rose).
- **Custom Pricing:** Has its own bundle `price` (and optional `discountPrice`), independent of the sum of individual perfumes.
- **Smart Stock Validation:** A package is considered "In Stock" only if all constituent perfumes have sufficient stock available. Ordering a package automatically deducts stock from each included perfume.

### 4. Unified Cart & Order Processing

- **Polymorphic Cart & Order Items:** A customer can add both individual `Product` items and `Package` boxes into the same shopping cart and checkout in a single transaction.
- **Price Snapshotting:** `OrderItem` stores `priceAtPurchase` so future price or discount edits by the admin never alter historical order totals.
- **Transactional Checkout:** Uses `prisma.$transaction` to validate stock, create the order, deduct inventory (for both standalone products and products inside packages), and clear the cart atomically.

---

## Base Entity Pattern (DRY Architecture)

While Prisma's schema DSL (`schema.prisma`) requires declaring audit fields explicitly per database table, the NestJS application layer enforces a **Base Entity Pattern** in TypeScript to avoid repetition across DTOs, serializers, and Swagger schemas:

```typescript
// src/common/entities/base.entity.ts
import { ApiProperty } from "@nestjs/swagger";

export abstract class BaseEntity {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
```

All domain entities/response models (`UserEntity`, `CategoryEntity`, `ProductEntity`, `PackageEntity`, `OrderEntity`) extend `BaseEntity` to inherit standard identifiers and timestamps consistently.

---

## Database Schema Overview (Prisma)

```prisma
enum Role {
  ADMIN
  CUSTOMER
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  phone     String?
  address   String?
  role      Role     @default(CUSTOMER)
  cart      Cart?
  orders    Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Category {
  id        String    @id @default(uuid())
  name      String    @unique
  slug      String    @unique
  image     String?
  products  Product[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Product {
  id                String        @id @default(uuid())
  name              String
  slug              String        @unique
  description       String
  price             Decimal       @db.Decimal(10, 2)
  discountPrice     Decimal?      @db.Decimal(10, 2)
  discountExpiresAt DateTime?
  stock             Int           @default(0)
  size              String        // e.g., "100ml"
  notes             Json?         // { top: [], heart: [], base: [] }
  images            String[]
  isFeatured        Boolean       @default(false)
  categoryId        String
  category          Category      @relation(fields: [categoryId], references: [id])
  packageItems      PackageItem[]
  cartItems         CartItem[]
  orderItems        OrderItem[]
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}

model Package {
  id                String        @id @default(uuid())
  name              String
  slug              String        @unique
  description       String
  price             Decimal       @db.Decimal(10, 2)
  discountPrice     Decimal?      @db.Decimal(10, 2)
  discountExpiresAt DateTime?
  images            String[]
  isFeatured        Boolean       @default(false)
  items             PackageItem[]
  cartItems         CartItem[]
  orderItems        OrderItem[]
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}

model PackageItem {
  id        String  @id @default(uuid())
  packageId String
  package   Package @relation(fields: [packageId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int     @default(1)

  @@unique([packageId, productId])
}

model Cart {
  id        String     @id @default(uuid())
  userId    String     @unique
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id        String   @id @default(uuid())
  cartId    String
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String?
  product   Product? @relation(fields: [productId], references: [id])
  packageId String?
  package   Package? @relation(fields: [packageId], references: [id])
  quantity  Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Order {
  id              String      @id @default(uuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  totalAmount     Decimal     @db.Decimal(10, 2)
  status          OrderStatus @default(PENDING)
  shippingAddress String
  phone           String
  paymentMethod   String      @default("COD")
  items           OrderItem[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model OrderItem {
  id              String   @id @default(uuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId       String?
  product         Product? @relation(fields: [productId], references: [id])
  packageId       String?
  package         Package? @relation(fields: [packageId], references: [id])
  quantity        Int
  priceAtPurchase Decimal  @db.Decimal(10, 2)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## API Endpoints Reference

### Auth (`/auth`)

- `POST /auth/register` — Register a new customer account.
- `POST /auth/login` — Authenticate and return JWT token + user role.
- `GET /auth/profile` — Get/update logged-in user details.

### Categories (`/categories`)

- `GET /categories` — List all categories (Public).
- `POST /categories` — Create category (`ADMIN`).
- `PATCH /categories/:id` — Update category (`ADMIN`).
- `DELETE /categories/:id` — Delete category (`ADMIN`).

### Products (`/products`)

- `GET /products` — List products with filters (`category`, `search`, `hasDiscount`, `minPrice`, `maxPrice`) & pagination (Public).
- `GET /products/:slug` — Get single perfume details + calculated active price (Public).
- `POST /products` — Create perfume (`ADMIN`).
- `PATCH /products/:id` — Update perfume details, stock, or discount (`ADMIN`).
- `DELETE /products/:id` — Delete perfume (`ADMIN`).

### Packages (`/packages`)

- `GET /packages` — List all gift boxes with included products and availability status (Public).
- `GET /packages/:slug` — Get package details and constituent perfumes (Public).
- `POST /packages` — Create a new package with product IDs & quantities (`ADMIN`).
- `PATCH /packages/:id` — Update package items, price, or discount (`ADMIN`).
- `DELETE /packages/:id` — Delete package (`ADMIN`).

### Cart (`/cart`)

- `GET /cart` — Retrieve current user's cart with calculated subtotals and active discounts (`CUSTOMER`).
- `POST /cart/items` — Add a `productId` OR `packageId` with `quantity` (`CUSTOMER`).
- `PATCH /cart/items/:id` — Update item quantity (`CUSTOMER`).
- `DELETE /cart/items/:id` — Remove item from cart (`CUSTOMER`).

### Orders (`/orders`)

- `POST /orders/checkout` — Convert cart to order & deduct inventory (`CUSTOMER`).
- `GET /orders/my-orders` — List customer's order history (`CUSTOMER`).
- `GET /orders` — List all store orders with status filter (`ADMIN`).
- `PATCH /orders/:id/status` — Update order status (`ADMIN`).

### Media Upload (`/upload`)

- `POST /upload` — Upload single/multiple images and return hosted URLs (`ADMIN`).
