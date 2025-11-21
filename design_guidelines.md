# Code Vortex – Gemini DevOps Copilot Design Guidelines

## Design Approach
**Reference-Based**: Inspired by GitHub's modern interface combined with Vercel's dashboard aesthetics, featuring glassmorphism design with cutting-edge developer tool experience.

## Color System
- **Primary**: #6366F1 (indigo)
- **Secondary**: #8B5CF6 (purple)
- **Accent**: #06B6D4 (cyan)
- **Background**: #0F172A (dark slate)
- **Surface**: #1E293B (slate)
- **Success**: #10B981 (emerald)
- **Warning**: #F59E0B (amber)
- **Text**: #F8FAFC (slate-50)

Professional gradients using primary/secondary/accent colors for glassmorphism effects and backgrounds.

## Typography
- **Primary Font**: Inter (UI text, headings, body)
- **Monospace Font**: JetBrains Mono (code snippets, technical data)
- **Hierarchy**: Bold headings (text-2xl to text-4xl), medium subheadings (text-lg to text-xl), regular body (text-sm to text-base)

## Layout System
**Spacing Units**: Tailwind 2, 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- Cards: p-6 to p-8
- Sections: py-12 to py-20
- Grids: gap-4 to gap-8

## Core Components

### Landing Page
- **Hero Section**: Full viewport height (min-h-screen) with 3D floating cube/sphere elements, particle background effects, animated gradient overlay
- **Hero Content**: Centered large heading with gradient text effect, descriptive subheading, dual CTA buttons (primary + secondary), animated on scroll
- **3D Elements**: Floating geometric shapes with CSS 3D transforms, slow rotation/movement animations
- **Particle Effects**: Background canvas with moving particles creating depth and motion

### Dashboard Layout
- **Sidebar Navigation**: Fixed left sidebar (w-64) with glassmorphism effect, navigation items with hover states and active indicators
- **Top Navbar**: Sticky header with repo selector dropdown, user settings, theme toggle, search
- **Main Content**: Grid layout (grid-cols-1 lg:grid-cols-3) for summary cards, full-width charts sections, responsive table layouts

### Glassmorphism Cards
- Background: `bg-slate-800/50` with `backdrop-blur-xl`
- Border: `border border-slate-700/50`
- Shadow: `shadow-xl` with subtle glow effects using box-shadow
- Rounded corners: `rounded-xl` to `rounded-2xl`
- Hover state: Subtle lift effect with `hover:shadow-2xl` and `hover:border-indigo-500/30`

### AI Chat Interface
- Message bubbles: User messages (right-aligned, indigo background), AI messages (left-aligned, slate surface)
- Streaming indicator: Pulsing dot animation during response generation
- Code blocks: JetBrains Mono font with syntax highlighting, copy button on hover
- Input area: Fixed bottom with glassmorphism backdrop, send button with gradient

### Dashboard Summary Cards
- Grid layout: 4 cards (commits, PRs, issues, hotspots)
- Animated counters: Count-up animation on page load
- Icon badges: Circular gradient backgrounds with lucide-react icons
- Live indicators: Pulsing dot for real-time status
- Trend indicators: Up/down arrows with percentage changes

### Charts & Visualizations
- Recharts components with custom styling matching color system
- Area charts for commit activity with gradient fills
- Bar charts for PR status with color-coded segments
- Responsive containers with proper aspect ratios
- Tooltips with glassmorphism styling

### Hotspot Analysis Table
- Sticky header with glassmorphism effect
- Zebra striping with subtle `bg-slate-800/30` on alternate rows
- Risk score badges: Color-coded (green/yellow/red) with rounded pills
- Clickable rows: Hover state opens AI analysis modal
- File path with truncation and hover tooltip

### Modals & Dialogs
- shadcn/ui Dialog with backdrop blur
- Centered content with max-width constraints
- Close button with hover effects
- Content sections with proper spacing and dividers

## Animations
- **Page transitions**: Fade-in on mount (200-300ms)
- **Hover effects**: Scale 1.02 transform with 200ms transition
- **Loading states**: Skeleton loaders with shimmer animation
- **3D elements**: Continuous slow rotation/floating with `@keyframes`
- **Scroll animations**: Fade-in/slide-up on elements entering viewport
- **Counter animations**: Number count-up using intersection observer
- **Pulse indicators**: Live status using `animate-pulse`

## Responsive Breakpoints
- Mobile: Single column layouts, collapsible sidebar (hamburger menu)
- Tablet (md): 2-column grids for cards
- Desktop (lg): Full multi-column layouts, visible sidebar
- All interactive elements touch-friendly (min 44px tap targets)

## Images
**Hero Section**: Large, high-quality abstract tech background (dark blue/purple gradients, circuit patterns, or 3D wireframe visualizations) with overlay gradient to ensure text readability. Buttons on hero should have blurred backgrounds (`backdrop-blur-md`).

**Dashboard**: Icon-based visualizations, no large images. Focus on data visualization through charts and metrics.