import React from 'react'
import { Link } from 'react-router-dom'
import routes from 'routes'
import chatAltIcon from 'assets/chat-alt-white.svg'
import EnvelopeIcon from 'assets/envelope_white.svg'
import errorIcon from 'assets/error.svg'
import { useMediaQueryUtils } from 'constants/exportHooks'

const ChevronLeft = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M10 12L6 8l4-4"
            stroke="#0052CC"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const cards = [
    {
        href: 'https://github.com/craftbase-org/craftbase/issues',
        icon: <img src={errorIcon} className="w-5 h-5" alt="Issues" />,
        label: 'GitHub Issues',
        description:
            'Found a bug or want to request a feature? Open an issue directly on our repository.',
        cta: 'Open an issue →',
    },
    {
        href: 'https://github.com/craftbase-org/craftbase/discussions',
        icon: <img src={chatAltIcon} className="w-5 h-5" alt="Discussions" />,
        label: 'GitHub Discussions',
        description:
            'Have a question or idea to share? Join the conversation with the community.',
        cta: 'Start a discussion →',
    },
]

const SupportPage = () => {
    // Hook used only where HTML structure changes between breakpoints
    const { isMobile } = useMediaQueryUtils()

    return (
        <div className="min-h-screen bg-neutrals-n20">
            {/* Nav */}
            <nav className="sticky top-0 z-10 bg-white border-b border-neutrals-n40 shadow-sm">
                <div className="w-full max-w-2xl mx-auto px-4 tablet-landscape:px-6 py-3 flex items-center justify-between">
                    <span className="text-primary-blue font-bold text-sm tablet-landscape:text-base tracking-tight">
                        Craftbase
                    </span>
                    <Link
                        to={routes.index}
                        className="flex items-center gap-1 text-sm text-primary-blue no-underline font-medium
                            px-2 py-1 rounded-md hover:bg-blues-b50 transition-all ease-in duration-150"
                    >
                        <ChevronLeft />
                        {/* Different label text = different HTML — valid hook use */}
                        {isMobile ? 'Back' : 'Back to board'}
                    </Link>
                </div>
            </nav>

            {/* Body */}
            <main className="w-full max-w-2xl mx-auto px-4 tablet-landscape:px-6 py-8 tablet-landscape:py-12">
                {/* Header */}
                <div className="mb-6 tablet-landscape:mb-10">
                    <h1 className="text-xl tablet-landscape:text-2xl font-bold text-neutrals-n700 tracking-tight mb-2">
                        Support
                    </h1>
                    <p className="text-xs tablet-landscape:text-sm text-neutrals-n300 leading-relaxed">
                        We're here to help. Choose how you'd like to get in
                        touch.
                    </p>
                </div>

                {/* Contact banner — layout flips on mobile */}
                <div
                    className="bg-blues-b50 border border-blues-b75 rounded-lg p-3 tablet-landscape:p-4 mb-6 tablet-landscape:mb-8
                    flex flex-col tablet-landscape:flex-row tablet-landscape:items-center gap-3"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-blue flex items-center justify-center flex-shrink-0">
                            <img
                                src={EnvelopeIcon}
                                className="w-5 h-5"
                                alt="Email"
                            />
                        </div>
                        {/* Label sits beside icon on mobile since banner is flex-col */}
                        {isMobile && (
                            <div className="text-xs font-semibold text-blues-b400">
                                Get in touch directly
                            </div>
                        )}
                    </div>
                    <div className="flex items-start flex-col gap-1">
                        {/* Label sits above email on tablet+ since banner is flex-row */}
                        {!isMobile && (
                            <div className="text-xs font-semibold text-blues-b400">
                                Get in touch directly
                            </div>
                        )}
                        <div className="text-xs text-blues-b500">
                            Email us at{' '}
                            <a
                                href="mailto:meetzaveri96@gmail.com"
                                className="text-primary-blue font-semibold no-underline border-b border-primary-blue"
                            >
                                meetzaveri96@gmail.com
                            </a>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-4 tablet-landscape:mb-5">
                    <div className="flex-1 h-px bg-neutrals-n40" />
                    <span className="text-xs font-semibold text-neutrals-n80 uppercase tracking-wider whitespace-nowrap">
                        Community
                    </span>
                    <div className="flex-1 h-px bg-neutrals-n40" />
                </div>

                {/* Cards — 1 col on mobile, 2 cols on tablet+ */}
                <div className="grid grid-cols-1 tablet-landscape:grid-cols-2 gap-3">
                    {cards.map((card) => (
                        <a
                            key={card.label}
                            href={card.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 bg-white border border-neutrals-n40 rounded-lg p-4 no-underline
                                shadow-md hover:shadow-lg transition-shadow ease-in duration-150"
                        >
                            <div className="w-9 h-9 rounded-lg bg-blues-b50 flex items-center justify-center flex-shrink-0">
                                {card.icon}
                            </div>
                            <div className="flex flex-col">
                                <div className="text-sm font-semibold text-neutrals-n700 mb-1">
                                    {card.label}
                                </div>
                                <div className="text-xs text-neutrals-n300 leading-relaxed mb-3">
                                    {card.description}
                                </div>
                                <div className="text-xs font-semibold text-primary-blue">
                                    {card.cta}
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </main>
        </div>
    )
}

export default SupportPage
