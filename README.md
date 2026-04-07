# GoneGift Frontend

## Environment Profiles

The project supports separate Vite env profiles:

- Production: `.env` (existing production values)
- Local testing/development: `.env.development`

Vite automatically loads `.env.development` when you run `npm run dev`.

1. Copy values from `.env.development.example` into `.env.development`.
2. Set your local API endpoint in `VITE_API_URL` (for example `http://localhost:5000`).
3. Set `VITE_APP_URL` to your frontend origin (for example `http://localhost:5173`).
4. Run `npm run dev`.

For other modes, you can also run:

```bash
npm run dev -- --mode development
```
