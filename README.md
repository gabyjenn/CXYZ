# Portfolio — Next.js + Sanity

One-page site: **Nav → Project Carousel → Information → News → Footer**, with Sanity Studio embedded at `/studio`.

## 1. Setup

```bash
npm install
npx sanity@latest init --env    # log in, create/select a project → writes projectId + dataset to .env.local
cp .env.local.example .env.local  # if init didn't create it, then fill in the values
npm run dev
```

- Site: http://localhost:3000
- Studio: http://localhost:3000/studio

In **sanity.io/manage → API → CORS origins**, add `http://localhost:3000` and your production URL (allow credentials).

Content updates show up on the live site within 60 s (ISR). Change `revalidate` in `sanity/client.ts` if you want faster/slower.

## 2. Fonts

Put licensed files in `public/fonts/`:

| File | Used for |
|---|---|
| `Remus-Regular.woff2` (+ `.woff`) | Latin |
| `CJK-Regular.woff2` | Chinese — **font still to be chosen** |

The CJK face only downloads when Chinese characters are on the page (`unicode-range`). Until a file exists, system Song/Noto Serif fonts are used.

## 3. Question module → Google Sheets

1. Create a Google Sheet → **Extensions → Apps Script** → paste `google-apps-script/Code.gs`.
2. Change `SECRET` to a random string.
3. **Deploy → New deployment → Web app** · Execute as *Me* · Access *Anyone* → copy the `/exec` URL.
4. In `.env.local` (and on Vercel): `GOOGLE_SHEETS_WEBHOOK_URL=<exec url>` and `GOOGLE_SHEETS_SECRET=<same secret>`.

Rows land in a `Responses` tab: *Submitted at · Question · Answer*. The question text itself is edited in Studio → Footer & Settings → Question module (leave empty to hide the module).

## 4. Content model (Studio)

| Studio item | Fields |
|---|---|
| **Projects** | Title, Chinese title, slug, year (optional), order, media[] (Image / Video / PDF, each with caption), thumbnail override |
| **Information** (singleton) | Bio (rich text), Awards, Exhibitions, Curatorial Projects, Film Screenings, Guest Lecture and Panel, Education, Bibliography — each a list of *year · text · detail · link*, auto-sorted newest first |
| **Log** | Date & time, "show time" toggle, text |
| **News** | Title, external link (optional), venue, date & time, end date, "show time" toggle |
| **Footer & Settings** (singleton) | Email, Instagram, Substack, portfolio PDF, copyright name, question + thank-you text, color scheme, slideshow interval |

The project thumbnail is the **first image** in the media list, unless an override is set.

## 5. Where things live

```
app/(site)/globals.css    all styles + design tokens (sizes, paddings, opacity, breakpoints)
app/(site)/page.tsx       fetches everything, renders the modules
app/studio/               embedded Studio
app/api/question/         form → Google Sheets
components/
  ProjectContext.tsx      current project/slide, transition timing (TRANSITION_MS)
  Nav.tsx                 logo + Projects / Log overlays (hover on desktop, click everywhere)
  Carousel.tsx            frame, pagination, random thumbnails, autoplay, dotted-line transition
  Media.tsx               image / video / PDF rendering
  Information.tsx, QuestionModule.tsx, News.tsx, Footer.tsx
sanity/schemaTypes/       content model
sanity/queries.ts         GROQ queries
lib/format.ts             date format (YYYY.MM.DD, timezone constant)
```

## 6. Decisions made / still open

- **Single page.** Information/News/Footer sit below the carousel; logo scrolls to top. A project can be deep-linked as `/?p=slug`.
- **Arrows:** dropped. Clicking the image goes to the next slide; ← → keys work; pagination numbers jump.
- **>10 images** (ask Chen): pagination switches automatically to `← 03 / 12 →`.
- **Autoplay:** every `carouselInterval` ms (default 10000). After a project's last slide it moves to the next project. Pauses while hovering the frame and when the tab is hidden.
- **Frame** hugs the media's aspect ratio inside the 65% × 80% (mobile: 100%−20px × 67%) box, using container query units.
- **Thumbnails** are placed randomly but never inside the *largest possible* frame area or the pagination strip, so they can't collide when slide sizes change. Reshuffled on load, project change and resize.
- **Transition:** dotted lines sweep top→bottom linearly with `mix-blend-mode: difference`. Built with CSS lines rather than an SVG, which answers the aspect-ratio question — it fits any carousel size. Content swaps at the midpoint. Disabled for `prefers-reduced-motion`.
- **Colors:** whole-site scheme is a Studio setting. Any module can also be inverted by adding `data-theme="dark"` to it.
- **Caption placement:** temporarily shown above the pagination (`TODO(design)` in `Carousel.tsx`).
- **Custom cursor:** not built yet.
- **Logo:** `public/logo.svg` is a placeholder.
- **Timezone:** dates render in `America/New_York` (`lib/format.ts`).

## 7. Deploy (Vercel)

Import the repo, add the four env vars, deploy. Add the production URL to Sanity CORS origins.
