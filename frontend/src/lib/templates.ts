import type { ContentType } from './contentTypes'

export type TemplateKind =
  | 'minimal'
  | 'hero'
  | 'newsletter'
  | 'journal'
  | 'longform'
  | 'magazine'
  | 'two-column'
  | 'timeline'
  | 'code-snippet'
  | 'code-playground'
  | 'data-table'
  | 'research-notes'
  | 'docs-overview'
  | 'faq'
  | 'changelog'
  | 'presentation'
  | 'poster'
  | 'invitation'
  | 'thankyou'
  | 'social'
  | 'project-brief'
  | 'landing'

export interface TemplateDefinition {
  id: string
  label: string
  description: string
  for: ContentType
  kind: TemplateKind
}

const title = 'Untitled'

export const TEMPLATE_DEFS: TemplateDefinition[] = [
  {
    id: 'article-hero',
    label: 'Article • Hero',
    description: 'Article with a large hero image and intro.',
    for: 'article',
    kind: 'hero',
  },
  {
    id: 'article-minimal',
    label: 'Article • Minimal',
    description: 'Clean article layout with headings and callout.',
    for: 'article',
    kind: 'minimal',
  },
  {
    id: 'article-longform',
    label: 'Article • Longform',
    description: 'Long, sectioned article with multiple headings.',
    for: 'article',
    kind: 'longform',
  },
  {
    id: 'article-magazine',
    label: 'Article • Magazine',
    description: 'Featured story with supporting grid of articles.',
    for: 'article',
    kind: 'magazine',
  },
  {
    id: 'article-two-column',
    label: 'Article • Two column',
    description: 'Content with a right-hand sidebar for meta and links.',
    for: 'article',
    kind: 'two-column',
  },
  {
    id: 'article-newsletter',
    label: 'Article • Newsletter',
    description: 'Editorial-style newsletter article.',
    for: 'article',
    kind: 'newsletter',
  },
  {
    id: 'blog-minimal',
    label: 'Blog • Minimal',
    description: 'Simple blog post layout.',
    for: 'blog',
    kind: 'minimal',
  },
  {
    id: 'blog-magazine',
    label: 'Blog • Magazine',
    description: 'Hero post with grid of recent posts.',
    for: 'blog',
    kind: 'magazine',
  },
  {
    id: 'blog-newsletter',
    label: 'Blog • Newsletter',
    description: 'Email-style update or newsletter.',
    for: 'blog',
    kind: 'newsletter',
  },
  {
    id: 'blog-journal',
    label: 'Blog • Daily log',
    description: 'Short daily update or changelog.',
    for: 'blog',
    kind: 'journal',
  },
  {
    id: 'blog-timeline',
    label: 'Blog • Timeline',
    description: 'Vertical timeline of posts/updates.',
    for: 'blog',
    kind: 'timeline',
  },
  {
    id: 'vlog-hero',
    label: 'Vlog • Hero',
    description: 'Vlog layout with primary video and notes.',
    for: 'vlog',
    kind: 'hero',
  },
  {
    id: 'vlog-minimal',
    label: 'Vlog • Minimal',
    description: 'Compact vlog layout with one main video.',
    for: 'vlog',
    kind: 'minimal',
  },
  {
    id: 'text-journal',
    label: 'Text • Journal',
    description: 'Daily journal style for quick notes.',
    for: 'text',
    kind: 'journal',
  },
  {
    id: 'text-longform',
    label: 'Text • Longform',
    description: 'Longform writing with sections.',
    for: 'text',
    kind: 'longform',
  },
  {
    id: 'text-notes',
    label: 'Text • Notes',
    description: 'Plain notes page with bullet list starter.',
    for: 'text',
    kind: 'journal',
  },
  {
    id: 'code-snippet',
    label: 'Code • Snippet',
    description: 'Single code snippet with explanation.',
    for: 'code',
    kind: 'code-snippet',
  },
  {
    id: 'code-playground',
    label: 'Code • Playground',
    description: 'Input, code, and output sections.',
    for: 'code',
    kind: 'code-playground',
  },
  {
    id: 'code-doc',
    label: 'Code • Snippet with docs',
    description: 'Code sample followed by documentation sections.',
    for: 'code',
    kind: 'longform',
  },
  {
    id: 'table-dataset',
    label: 'Table • Dataset',
    description: 'Dataset-oriented table with summary.',
    for: 'table',
    kind: 'data-table',
  },
  {
    id: 'table-report',
    label: 'Table • Report',
    description: 'KPI summary with a data table.',
    for: 'table',
    kind: 'newsletter',
  },
  {
    id: 'hybrid-research',
    label: 'Hybrid • Research notes',
    description: 'Mix of text, code, and tables for research logs.',
    for: 'hybrid',
    kind: 'research-notes',
  },
  {
    id: 'hybrid-spec',
    label: 'Hybrid • Spec document',
    description: 'Specification with mixed narrative, code, and tables.',
    for: 'hybrid',
    kind: 'longform',
  },
  {
    id: 'docs-overview',
    label: 'Docs • Overview',
    description: 'Documentation landing page with sidebar navigation.',
    for: 'article',
    kind: 'docs-overview',
  },
  {
    id: 'docs-faq',
    label: 'Docs • FAQ',
    description: 'Frequently asked questions with answers.',
    for: 'article',
    kind: 'faq',
  },
  {
    id: 'docs-changelog',
    label: 'Docs • Changelog',
    description: 'Release notes in a reverse-chronological timeline.',
    for: 'blog',
    kind: 'changelog',
  },
  {
    id: 'presentation-outline',
    label: 'Presentation • Outline',
    description: 'Slide-style sections for talks or decks.',
    for: 'article',
    kind: 'presentation',
  },
  {
    id: 'poster-event',
    label: 'Poster • Event',
    description: 'Bold heading, date, and call-to-action like an event poster.',
    for: 'article',
    kind: 'poster',
  },
  {
    id: 'invite-simple',
    label: 'Invitation • Simple',
    description: 'Invite card layout with event details and RSVP.',
    for: 'article',
    kind: 'invitation',
  },
  {
    id: 'letter-thankyou',
    label: 'Letter • Thank you',
    description: 'Thank-you letter with sender and recipient details.',
    for: 'article',
    kind: 'thankyou',
  },
  {
    id: 'social-card',
    label: 'Social • Post card',
    description: 'Vertical card for social posts with bold title and CTA.',
    for: 'blog',
    kind: 'social',
  },
  {
    id: 'project-brief',
    label: 'Project • Brief',
    description: 'One-page project brief with goals, scope, and timeline.',
    for: 'article',
    kind: 'project-brief',
  },
  {
    id: 'website-landing',
    label: 'Website • Landing page',
    description: 'Simple landing page with hero, features, and CTA.',
    for: 'article',
    kind: 'landing',
  },
]

export function getTemplateHTML(type: Extract<ContentType, 'blog' | 'article' | 'vlog'>, template: TemplateKind): string {
  // Hero layout shared by article/blog/vlog
  if (template === 'hero') {
    return `
<section class="mb-6 text-center">
  <img src="" alt="" class="mx-auto mb-4 aspect-[16/9] w-full max-w-3xl rounded-md bg-gray-200" />
  <h1 class="text-4xl font-bold mb-2">${title}</h1>
  <p class="text-gray-600">A short subtitle or description.</p>
</section>
<h2>Introduction</h2>
<p>Write your introduction here...</p>
${type !== 'vlog' ? '<h2>Main content</h2><p>...</p>' : '<h2>Video</h2><p>Paste a video URL and notes.</p>'}
`}

  // Article-specific variants
  if (type === 'article') {
    if (template === 'docs-overview') {
      return `
<section class="grid gap-8 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
  <aside class="border rounded-md p-4 text-sm bg-gray-50">
    <p class="mb-2 text-xs font-semibold tracking-wide text-gray-500">On this page</p>
    <ol class="space-y-1 list-decimal list-inside">
      <li>Getting started</li>
      <li>Core concepts</li>
      <li>Advanced topics</li>
    </ol>
  </aside>
  <article class="space-y-6">
    <header>
      <p class="text-xs uppercase tracking-wide text-gray-500">Docs</p>
      <h1 class="text-3xl font-bold mb-1">${title}</h1>
      <p class="text-gray-600">Use this page as the entry point for your documentation.</p>
    </header>
    <section>
      <h2 class="text-xl font-semibold mb-2">Getting started</h2>
      <p>Explain how to get started using your product or project.</p>
    </section>
    <section>
      <h2 class="text-xl font-semibold mb-2">Core concepts</h2>
      <p>Describe the main ideas people need to understand.</p>
    </section>
    <section>
      <h2 class="text-xl font-semibold mb-2">Advanced topics</h2>
      <p>Link to more detailed guides, references, and examples.</p>
    </section>
  </article>
</section>
`}
    if (template === 'faq') {
      return `
<header class="mb-6">
  <p class="text-xs uppercase tracking-wide text-gray-500">Help</p>
  <h1 class="text-3xl font-bold mb-1">${title}</h1>
  <p class="text-gray-600">Use this page to answer common questions.</p>
</header>
<section class="space-y-3">
  <details class="rounded-md border p-3">
    <summary class="font-medium cursor-pointer">Question one?</summary>
    <p class="mt-2 text-sm text-gray-600">Answer text goes here.</p>
  </details>
  <details class="rounded-md border p-3">
    <summary class="font-medium cursor-pointer">Question two?</summary>
    <p class="mt-2 text-sm text-gray-600">Answer text goes here.</p>
  </details>
  <details class="rounded-md border p-3">
    <summary class="font-medium cursor-pointer">Another question?</summary>
    <p class="mt-2 text-sm text-gray-600">Answer text goes here.</p>
  </details>
</section>
`}
    if (template === 'minimal') {
      return `
<h1 class="text-4xl font-bold mb-2">${title}</h1>
<p class="text-gray-600">By Author • ${new Date().toLocaleDateString()}</p>
<h2>Overview</h2>
<p>...</p>
<blockquote>Quote or callout.</blockquote>
<h2>Details</h2>
<p>...</p>
`}
    if (template === 'newsletter') {
      return `
<p class="text-xs uppercase tracking-wide text-gray-500">Newsletter</p>
<h1 class="text-3xl font-bold mb-1">${title}</h1>
<p class="text-gray-600 mb-4">Edition #1 • ${new Date().toLocaleDateString()}</p>
<h2>From the editor</h2>
<p>...</p>
<h2>Highlights</h2>
<ul class="list-disc pl-5 space-y-1">
  <li>Story one</li>
  <li>Story two</li>
</ul>
`}
    if (template === 'presentation') {
      return `
<section class="mb-6 rounded-3xl bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400 px-6 py-8 text-white">
  <p class="text-xs uppercase tracking-[0.25em] opacity-80 mb-2">Presentation</p>
  <h1 class="text-4xl font-extrabold mb-2">${title}</h1>
  <p class="max-w-xl text-sm opacity-90">Write a one-line promise or key takeaway for your audience.</p>
</section>
<section class="grid gap-4 md:grid-cols-3 mb-6">
  <article class="rounded-2xl bg-white p-4 text-sm shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1">Slide 1</p>
    <h2 class="font-semibold mb-1">Problem</h2>
    <p class="text-gray-600">Describe the problem you&apos;re solving.</p>
  </article>
  <article class="rounded-2xl bg-white p-4 text-sm shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-1">Slide 2</p>
    <h2 class="font-semibold mb-1">Solution</h2>
    <p class="text-gray-600">Summarize your solution in one or two bullets.</p>
  </article>
  <article class="rounded-2xl bg-white p-4 text-sm shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">Slide 3</p>
    <h2 class="font-semibold mb-1">Impact</h2>
    <p class="text-gray-600">Share expected outcomes or key metrics.</p>
  </article>
</section>
<section class="grid gap-4 md:grid-cols-2">
  <article class="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-4 text-sm">
    <h2 class="font-semibold mb-2">Agenda</h2>
    <ul class="list-disc pl-5 space-y-1 text-gray-700">
      <li>Introduction</li>
      <li>Main topic</li>
      <li>Q&amp;A</li>
    </ul>
  </article>
  <article class="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-4 text-sm">
    <h2 class="font-semibold mb-2">Key points</h2>
    <p class="text-gray-700">Capture the 3 most important things you want people to remember.</p>
  </article>
</section>
`}
    if (template === 'longform') {
      return `
<h1 class="text-4xl font-bold mb-2">${title}</h1>
<p class="text-gray-600 mb-6">Subtitle or standfirst goes here.</p>
<h2>Section one</h2>
<p>...</p>
<h2>Section two</h2>
<p>...</p>
<h2>Conclusion</h2>
<p>...</p>
`}
    if (template === 'magazine') {
      return `
<section class="mb-8 grid gap-6 md:grid-cols-3">
  <article class="md:col-span-2">
    <p class="text-xs uppercase tracking-wide text-gray-500 mb-1">Featured</p>
    <h1 class="text-4xl font-bold mb-2">${title}</h1>
    <p class="text-gray-600 mb-4">Lead story introduction text...</p>
  </article>
  <aside class="space-y-3 text-sm">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Also in this issue</h2>
    <ul class="space-y-1">
      <li>Secondary story one</li>
      <li>Secondary story two</li>
      <li>Secondary story three</li>
    </ul>
  </aside>
</section>
<h2>Main feature</h2>
<p>...</p>
`}
    if (template === 'two-column') {
      return `
<section class="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
  <article>
    <h1 class="text-3xl font-bold mb-2">${title}</h1>
    <p class="text-gray-600 mb-4">Short kicker or summary.</p>
    <h2>Introduction</h2>
    <p>...</p>
  </article>
  <aside class="space-y-4 border-t pt-4 md:border-t-0 md:border-l md:pl-4 text-sm text-gray-600">
    <div>
      <h3 class="font-semibold mb-1">Details</h3>
      <p>Author, date, reading time...</p>
    </div>
    <div>
      <h3 class="font-semibold mb-1">Related links</h3>
      <ul class="list-disc pl-4 space-y-1">
        <li>Related article 1</li>
        <li>Related article 2</li>
      </ul>
    </div>
  </aside>
</section>
`}
    if (template === 'poster') {
      return `
<section class="mx-auto max-w-xl rounded-[2.5rem] bg-gradient-to-br from-purple-700 via-fuchsia-500 to-orange-400 p-8 text-white shadow-xl">
  <header class="mb-6 text-center">
    <p class="text-xs uppercase tracking-[0.3em] opacity-80 mb-2">Event poster</p>
    <h1 class="text-4xl font-extrabold leading-tight mb-2">${title}</h1>
    <p class="text-sm opacity-90">Drop a punchy tagline or description here.</p>
  </header>
  <div class="mb-6 grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] text-sm">
    <div>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-amber-200 mb-1">When</h2>
      <p class="mb-3">Date • Time</p>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-amber-200 mb-1">Where</h2>
      <p>Location or online event link.</p>
    </div>
    <div class="rounded-2xl bg-white/10 p-3 text-xs">
      <p class="font-semibold mb-1">Call to action</p>
      <p class="opacity-90">Add your registration or RSVP instructions here.</p>
    </div>
  </div>
  <footer class="flex flex-wrap items-center justify-between gap-3 text-xs">
    <span class="rounded-full bg-white/15 px-3 py-1 font-medium uppercase tracking-wide">Free entry</span>
    <span class="opacity-80">@yourhandle • yourwebsite.com</span>
  </footer>
</section>
`}
    if (template === 'invitation') {
      return `
<section class="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-rose-50/70 p-8 text-rose-900">
  <p class="text-xs uppercase tracking-[0.3em] text-rose-500 mb-2">You&apos;re invited</p>
  <h1 class="text-3xl font-bold mb-1">${title}</h1>
  <p class="mb-4 text-sm text-rose-700">Write a warm one or two sentence invitation message.</p>
  <div class="grid gap-4 text-sm md:grid-cols-2">
    <div>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-rose-500 mb-1">Date &amp; time</h2>
      <p>Day, date • Time</p>
      <h2 class="mt-3 text-xs font-semibold uppercase tracking-wide text-rose-500 mb-1">Location</h2>
      <p>Venue or online link.</p>
    </div>
    <div class="rounded-2xl bg-white/70 p-3">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-rose-500 mb-1">RSVP</h2>
      <p>Add contact or RSVP instructions here.</p>
    </div>
  </div>
</section>
`}
    if (template === 'thankyou') {
      return `
<section class="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-emerald-50/70 p-8 text-emerald-950">
  <p class="text-xs uppercase tracking-[0.3em] text-emerald-500 mb-2">Thank you</p>
  <h1 class="text-3xl font-semibold mb-4">${title}</h1>
  <p class="mb-4">Dear <span class="underline decoration-emerald-400">[Name]</span>,</p>
  <p class="mb-4 text-sm">Use this space to write a personal thank-you message. Share what you appreciate and why it matters.</p>
  <p class="mb-6 text-sm">With gratitude,</p>
  <p class="font-medium">[Your name]</p>
</section>
`}
    if (template === 'project-brief') {
      return `
<section class="mb-6 rounded-3xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 px-6 py-7 text-white">
  <p class="text-xs uppercase tracking-[0.25em] opacity-80 mb-1">Project brief</p>
  <h1 class="text-3xl font-bold mb-1">${title}</h1>
  <p class="text-sm opacity-90">Summarize what this project is about in one or two sentences.</p>
</section>
<section class="grid gap-4 md:grid-cols-3 mb-6 text-sm">
  <article class="rounded-2xl border border-sky-100 bg-white p-4 text-gray-800">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-sky-600 mb-1">Goals</h2>
    <ul class="list-disc pl-4 space-y-1 text-gray-700">
      <li>Goal one</li>
      <li>Goal two</li>
    </ul>
  </article>
  <article class="rounded-2xl border border-indigo-100 bg-white p-4 text-gray-800">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1">Scope</h2>
    <p class="text-gray-700">Describe what is in scope and out of scope.</p>
  </article>
  <article class="rounded-2xl border border-violet-100 bg-white p-4 text-gray-800">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-violet-600 mb-1">Timeline</h2>
    <p class="text-gray-700">Key milestones and dates.</p>
  </article>
</section>
<section class="grid gap-4 md:grid-cols-2 text-sm">
  <article class="rounded-2xl border border-gray-200 bg-white p-4 text-gray-800">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Stakeholders</h2>
    <p>Add owners, sponsors, and collaborators.</p>
  </article>
  <article class="rounded-2xl border border-gray-200 bg-white p-4 text-gray-800">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Risks &amp; assumptions</h2>
    <p>List important risks or assumptions for this project.</p>
  </article>
</section>
`}
    if (template === 'landing') {
      return `
<section class="mb-8 grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-center">
  <div>
    <p class="text-xs uppercase tracking-[0.25em] text-sky-500 mb-2">Landing page</p>
    <h1 class="text-4xl font-extrabold mb-3">${title}</h1>
    <p class="mb-5 max-w-xl text-gray-600">Write a clear value proposition that explains what you offer and who it&apos;s for.</p>
    <div class="flex flex-wrap items-center gap-3">
      <button class="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm">Primary action</button>
      <button class="rounded-full border border-sky-200 px-5 py-2 text-sm font-semibold text-sky-700 bg-sky-50">Secondary</button>
      <p class="text-xs text-gray-500">No credit card required.</p>
    </div>
  </div>
  <div class="rounded-3xl border border-dashed border-sky-200 bg-sky-50/60 p-4 text-xs text-gray-600">
    <p class="font-semibold mb-1">Hero image area</p>
    <p>Drop a product screenshot or illustration here.</p>
  </div>
</section>
<section class="grid gap-4 md:grid-cols-3 mb-8 text-sm">
  <article class="rounded-2xl border border-gray-200 bg-white p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-sky-500 mb-1">Feature one</p>
    <p class="text-gray-700">Describe a key benefit or capability.</p>
  </article>
  <article class="rounded-2xl border border-gray-200 bg-white p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-sky-500 mb-1">Feature two</p>
    <p class="text-gray-700">Describe a key benefit or capability.</p>
  </article>
  <article class="rounded-2xl border border-gray-200 bg-white p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-sky-500 mb-1">Feature three</p>
    <p class="text-gray-700">Describe a key benefit or capability.</p>
  </article>
</section>
<section class="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
  <p class="mb-2 font-semibold">Social proof</p>
  <p>Add testimonials, logos, or trust signals here.</p>
</section>
`}
  }

  // Blog / vlog variants
  if (type === 'blog') {
    if (template === 'minimal') {
      return `
<h1 class="text-3xl font-bold mb-2">${title}</h1>
<p class="text-gray-600 mb-4">${new Date().toLocaleDateString()} • Tags</p>
<p>Write your post here...</p>
`}
    if (template === 'journal') {
      return `
<h1 class="text-2xl font-semibold mb-2">Daily log</h1>
<p class="text-gray-600 mb-4">${new Date().toLocaleDateString()}</p>
<ul class="space-y-2">
  <li>• Update 1</li>
  <li>• Update 2</li>
</ul>
`}
    if (template === 'timeline') {
      return `
<h1 class="text-3xl font-bold mb-4">${title}</h1>
<ol class="relative border-l border-gray-200 space-y-4">
  <li class="ml-4">
    <div class="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-500"></div>
    <time class="text-xs uppercase tracking-wide text-gray-500">Today</time>
    <h2 class="font-semibold">First entry</h2>
    <p class="text-sm text-gray-600">...</p>
  </li>
  <li class="ml-4">
    <div class="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-gray-300"></div>
    <time class="text-xs uppercase tracking-wide text-gray-500">Earlier</time>
    <h2 class="font-semibold">Second entry</h2>
    <p class="text-sm text-gray-600">...</p>
  </li>
</ol>
`}
    if (template === 'changelog') {
      return `
<h1 class="text-3xl font-bold mb-2">${title}</h1>
<p class="text-gray-600 mb-6">Release notes and changes over time.</p>
<ol class="relative border-l border-gray-200 space-y-6">
  <li class="ml-4">
    <div class="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-emerald-500"></div>
    <time class="text-xs uppercase tracking-wide text-gray-500">Today</time>
    <h2 class="font-semibold">Version 1.0.0</h2>
    <ul class="mt-1 text-sm list-disc list-inside text-gray-600">
      <li>Initial release.</li>
    </ul>
  </li>
  <li class="ml-4">
    <div class="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-gray-300"></div>
    <time class="text-xs uppercase tracking-wide text-gray-500">Earlier</time>
    <h2 class="font-semibold">Previous version</h2>
    <ul class="mt-1 text-sm list-disc list-inside text-gray-600">
      <li>Describe what changed in the previous release.</li>
    </ul>
  </li>
</ol>
`}
    if (template === 'social') {
      return `
<section class="mx-auto max-w-md rounded-3xl border bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 p-6 text-white">
  <p class="text-xs uppercase tracking-[0.2em] opacity-80 mb-2">Social post</p>
  <h1 class="text-2xl font-bold mb-2">${title}</h1>
  <p class="text-sm mb-4">Write a short, catchy message for your audience.</p>
  <button class="rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">Call to action</button>
</section>
`}
    if (template === 'magazine') {
      return `
<section class="mb-8">
  <p class="text-xs uppercase tracking-wide text-gray-500 mb-1">Featured post</p>
  <h1 class="text-4xl font-bold mb-2">${title}</h1>
  <p class="text-gray-600 mb-4">Intro to the featured story...</p>
</section>
<section class="grid gap-4 md:grid-cols-3 text-sm">
  <article class="border rounded-md p-3">
    <h2 class="font-semibold mb-1">Post title</h2>
    <p class="text-gray-600 line-clamp-3">Summary text...</p>
  </article>
  <article class="border rounded-md p-3">
    <h2 class="font-semibold mb-1">Post title</h2>
    <p class="text-gray-600 line-clamp-3">Summary text...</p>
  </article>
  <article class="border rounded-md p-3">
    <h2 class="font-semibold mb-1">Post title</h2>
    <p class="text-gray-600 line-clamp-3">Summary text...</p>
  </article>
</section>
`}
  }

  // Vlog minimal fallback
  if (type === 'vlog' && template === 'minimal') {
    return `
<h1 class="text-3xl font-bold mb-2">${title}</h1>
<p class="text-gray-600 mb-4">Describe your vlog episode...</p>
<p>Paste your video link and notes here.</p>
`}

  // Default minimal
  return `
<h1 class="text-4xl font-bold mb-2">${title}</h1>
<p class="text-gray-600">Write something amazing...</p>
`}

export function getTemplateById(id: string): TemplateDefinition | undefined {
  return TEMPLATE_DEFS.find(t => t.id === id)
}
