# Veil storefront

React + TypeScript storefront and administration dashboard for the Veil NestJS API.

## Run locally

```sh
npm install
npm run dev
```

By default the frontend connects to `http://localhost:3000/api/v1`. Set `VITE_API_URL` in a local `.env` file to point at another API base URL.

The admin portal is available at `/admin/login`; customer pages start at `/`. The backend serves the API envelope, so the Axios client unwraps the envelope's `data` field. Admin uploads use `POST /upload/image` and require an authenticated admin token.

Run `npm run build` to type-check and create the production bundle in `dist/`.
