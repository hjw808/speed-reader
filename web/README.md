# Speed Reader

A modern RSVP (Rapid Serial Visual Presentation) speed reader with ORP (Optimal Recognition Point) highlighting. Built with Next.js and featuring AI-powered lesson generation.

## Features

- **RSVP Reading** - Words displayed one at a time in the same position, eliminating eye movement
- **ORP Highlighting** - Red highlighted letter shows the optimal recognition point for faster processing
- **AI Lesson Generator** - Generate custom lessons on any topic using Puter.js AI
- **Multiple Reading Styles** - "Explain like I'm 5", Quick summary, Technical deep-dive, With examples
- **Adjustable Speed** - 100-800 WPM with smart punctuation pausing
- **Keyboard Shortcuts** - Full keyboard control for seamless reading
- **Dark Theme** - Easy on the eyes for extended reading sessions
- **ADHD Friendly** - Designed to help maintain focus by eliminating distractions

## How It Works

### RSVP (Rapid Serial Visual Presentation)
Traditional reading involves your eyes constantly moving across the page - studies show this accounts for about 80% of reading time. RSVP displays words one at a time in the exact same position, eliminating eye movement entirely.

### ORP (Optimal Recognition Point)
The red highlighted letter in each word is the Optimal Recognition Point - the position slightly left of center where your eye naturally focuses. By highlighting this letter, your brain can process words faster.

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Usage

### Upload a Text File
1. Click "Upload Text File" or drag and drop a `.txt` file
2. Press "Start" or hit Space to begin reading
3. Use arrow keys to adjust speed or skip words

### Generate AI Lessons
1. Click "Generate with AI"
2. Enter a topic (e.g., "JavaScript Promises")
3. Enter what you want to learn (e.g., "What they are, how to create them, error handling")
4. Choose an explanation style
5. Select words per lesson (50-300)
6. Click "Generate Lessons"

*Note: AI generation requires a free Puter.js account. You'll be prompted to sign in on first use.*

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` | Skip back 5 words |
| `→` | Skip forward 5 words |
| `↑` | Increase speed (+50 WPM) |
| `↓` | Decrease speed (-50 WPM) |
| `Esc` | Restart current content |

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Lucide React](https://lucide.dev/) - Icons
- [Puter.js](https://puter.com/) - AI generation (free, no API key required)

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
└── components/
    ├── speed-reader.tsx  # Main speed reader component
    └── ui/               # shadcn components
```

## Deploy

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/YOUR_REPO)

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- Self-hosted with `npm run build && npm start`

## License

MIT
