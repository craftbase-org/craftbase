module.exports = {
    safelist: [
        'text-ink',
        'text-ink-mid',
        'text-ink-muted',
        'text-border-card',
        'bg-accent',
        'bg-topbar-hover',
    ],
    darkMode: 'class',
    content: [
        './src/**/*.html',
        './src/**/*.js',
        './src/**/*.jsx',
        './src/**/*.ts',
        './src/**/*.tsx',
    ],
    future: {
        removeDeprecatedGapUtilities: true,
    },
    theme: {
        // screens: {
        //     sm: '640px',
        //     md: '768px',
        //     lg: '1024px',
        //     xl: '1280px',
        // },

        fontFamily: {
            ui: ['Geist', 'system-ui', 'sans-serif'],
            display: ['Fraunces', 'Georgia', 'serif'],
            sketch: ['Caveat Brush', 'cursive'],
            mono: ['Geist Mono', 'monospace'], // added — for coordinates, hex values, dimension chips
        },
        // borderWidth: {
        //     default: '1px',
        //     0: '0',
        //     2: '2px',
        //     4: '4px',
        // },
        extend: {
            colors: {
                // ── existing palette ─────────────────────────────────────
                primary: {
                    blue: '#0052CC',
                    red: '#BF2600',
                },
                cyan: '#9cdbff',
                reds: {
                    r500: '#BF2600',
                    r400: '#DE350B',
                    r300: '#FF5630',
                    r200: '#FF7452',
                    r100: '#FF8F73',
                    r75: '#FFBDAD',
                    r50: '#FFEBE6',
                },
                yellows: {
                    y500: '#FF8B00',
                    y400: '#FF991F',
                    y300: '#FFAB00',
                    y200: '#FFC400',
                    y100: '#FFE380',
                    y75: '#FFF0B3',
                    y50: '#FFFAE6',
                },
                greens: {
                    g500: '#006644',
                    g400: '#00875A',
                    g300: '#36B37E',
                    g200: '#57D9A3',
                    g100: '#79F2C0',
                    g75: '#ABF5D1',
                    g50: '#E3FCEF',
                },
                teals: {
                    t500: '#008DA6',
                    t400: '#00A3BF',
                    t300: '#00B8D9',
                    t200: '#00C7E6',
                    t100: '#79E2F2',
                    t75: '#B3F5FF',
                    t50: '#E6FCFF',
                },
                blues: {
                    b500: '#0747A6',
                    b400: '#0052CC',
                    b300: '#0065FF',
                    b200: '#2684FF',
                    b100: '#4C9AFF',
                    b75: '#B3D4FF',
                    b50: '#DEEBFF',
                },
                purples: {
                    p500: '#403294',
                    p400: '#5243AA',
                    p300: '#6554C0',
                    p200: '#8777D9',
                    p100: '#998DD9',
                    p75: '#C0B6F2',
                    p50: '#EAE6FF',
                },
                neutrals: {
                    n900: '#091E42',
                    n700: '#253858',
                    n500: '#42526E',
                    n300: '#5E6C84',
                    n100: '#7A869A',
                    n80: '#97A0AF',
                    n60: '#B3BAC5',
                    n40: '#DFE1E6',
                    n20: '#F4F5F7',
                },

                // ── Warm Studio tokens ────────────────────────────────────
                // Theming-relevant chrome tokens reference CSS variables (see
                // :root + .dark in src/App.css) so a `.dark` class on <html>
                // flips them with zero per-component edits. The variables hold
                // space-separated RGB *channels* (e.g. `232 200 122`), wrapped
                // here as `rgb(var(--x) / <alpha-value>)` so opacity modifiers
                // like `bg-accent/30` keep working. Light/dark values live in
                // App.css, not here.
                // Canvas & surfaces
                canvas: 'rgb(var(--color-canvas) / <alpha-value>)', // main canvas bg — the parchment
                sidebar: 'rgb(var(--color-sidebar) / <alpha-value>)', // left/right panel bg
                'card-bg': 'rgb(var(--color-card) / <alpha-value>)', // default shape/card fill

                // Chrome
                topbar: 'rgb(var(--color-topbar) / <alpha-value>)', // espresso top bar
                'topbar-hover': 'rgb(var(--color-topbar-hover) / <alpha-value>)', // tool hover bg in topbar

                // Accent — amber replaces blue as the interaction color
                accent: {
                    DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)', // active tools, buttons, selections → bg-accent
                    dark: 'rgb(var(--color-accent-dark) / <alpha-value>)', // highlighted card borders → bg-accent-dark
                    glow: 'var(--color-accent-glow)', // focus rings → (use in CSS, not as a utility)
                },

                // Text — all warm undertones, no cool grays
                ink: {
                    DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)', // primary text, near-black  → text-ink
                    mid: 'rgb(var(--color-ink-mid) / <alpha-value>)', // secondary text            → text-ink-mid
                    muted: 'rgb(var(--color-ink-muted) / <alpha-value>)', // labels, hints, placeholders → text-ink-muted
                },

                // Borders
                border: {
                    panel: 'rgb(var(--color-border-panel) / <alpha-value>)', // sidebar/panel dividers → border-border-panel
                    card: 'rgb(var(--color-border-card) / <alpha-value>)', // card outlines, grid dots → border-border-card
                },

                // Canvas element fill palette (for shape fill picker)
                fill: {
                    amber: '#E8C87A',
                    coral: '#E87A6A',
                    teal: '#7AC4A8',
                    blue: '#7A9AE8',
                    purple: '#A87AE8',
                    dark: '#3A342C',
                    neutral: '#C4B89A',
                },

                // Sticky note backgrounds
                sticky: {
                    yellow: '#F2DC90',
                    coral: '#F2A090',
                },
            },

            // ── box shadows ───────────────────────────────────────────────
            // Offset flat shadow = physical index card feel (no blur = no softness)
            boxShadow: {
                card: '3px 3px 0 rgb(var(--color-border-card))', // default card lift
                'card-accent': '3px 3px 0 rgb(var(--color-accent-dark))', // highlighted/selected card
                focus: '0 0 0 2px var(--color-accent-glow)', // amber focus ring
                sticky: '2px 2px 8px rgba(0, 0, 0, 0.10)', // sticky note
            },

            // ── border radius ─────────────────────────────────────────────
            borderRadius: {
                card: '4px', // cards/shapes — intentionally NOT rounded
                pill: '100px', // zoom bar, tags
            },

            spacing: {
                96: '24rem',
                128: '32rem',
            },

            screens: {
                tablet: '640px',
                'tablet-landscape': '768px',
                laptop: '1024px',
                desktop: '1280px',
                'big-desktop': '1536px',
                'ultra-desktop': '1792px',
            },
        },
    },
}
