import React, { Fragment, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { allColorShades, essentialShades } from '../../utils/constants'
import { motion, AnimatePresence } from 'framer-motion'
import { MIXED } from '../../utils/groupInspect'

const STORAGE_KEY = 'craftbase_saved_colors'
const MAX_SAVED = 8

const loadSavedColors = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

const persistSavedColors = (colors) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
    } catch {}
}

const ColorPicker = ({
    title,
    onChangeComplete,
    currentColor,
    isExpanded,
    onToggleExpand,
}) => {
    const [localExpanded, setLocalExpanded] = useState(false)
    const [savedColors, setSavedColors] = useState(loadSavedColors)
    const [removingColor, setRemovingColor] = useState(null)
    const isMixed = currentColor === MIXED
    const [hexInput, setHexInput] = useState(
        isMixed ? '' : (currentColor?.replace(/^#/, '') ?? '')
    )

    // Support both controlled (isExpanded prop) and uncontrolled (local state) modes.
    const controlled = isExpanded !== undefined
    const expanded = controlled ? isExpanded : localExpanded
    const handleToggle = onToggleExpand ?? (() => setLocalExpanded((p) => !p))

    useEffect(() => {
        if (currentColor === MIXED) {
            setHexInput('')
            return
        }
        setHexInput(currentColor?.replace(/^#/, '') ?? '')
    }, [currentColor])

    useEffect(() => {
        persistSavedColors(savedColors)
    }, [savedColors])

    const handleColorSelect = (color) => {
        onChangeComplete(color)
    }

    const handleHexSubmit = () => {
        const full = `#${hexInput.toUpperCase()}`
        if (/^#[0-9A-Fa-f]{6}$/.test(full)) {
            onChangeComplete(full)
        }
    }

    const handleSaveColor = () => {
        if (
            !currentColor ||
            savedColors.includes(currentColor) ||
            savedColors.length >= MAX_SAVED
        )
            return
        setSavedColors((prev) => [...prev, currentColor])
    }

    const handleRemoveColor = (color) => {
        setSavedColors((prev) => prev.filter((c) => c !== color))
        setRemovingColor(null)
    }

    const hasColor = !!currentColor && !isMixed
    // Diagonal-stripe pattern reused for the "Mixed" indicator swatches.
    const mixedSwatchBg =
        'repeating-linear-gradient(45deg, #C4B89A 0 4px, #F5F0E8 4px 8px)'

    const swatchStyle = (color) => ({
        background: color,
        border: color === '#FFFFFF' ? '1.5px solid #1A1612' : 'none',
        outline: currentColor === color ? '2px solid #C48B0A' : 'none',
        outlineOffset: '1.5px',
    })

    return (
        <Fragment>
            {/* Header: section label + badge pill */}
            <div className="flex items-center justify-between mb-2">
                {title && (
                    <span className="text-[11px] text-[#8a7d6b] uppercase tracking-[0.06em] font-medium">
                        {title}
                    </span>
                )}
                <button
                    onClick={handleToggle}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                        expanded
                            ? 'bg-[#FFF5E0] border-[1.5px] border-[#C48B0A] text-[#7a4a00]'
                            : 'bg-[#F5F0E8] border border-[#C4B89A] text-[#5a4e40]'
                    }`}
                >
                    <div
                        className="w-3.5 h-3.5 rounded-[3px] flex-shrink-0"
                        style={{
                            background: isMixed
                                ? mixedSwatchBg
                                : hasColor
                                    ? currentColor
                                    : 'transparent',
                            border:
                                hasColor || isMixed
                                    ? 'none'
                                    : '1.5px solid #1A1612',
                        }}
                    />
                    <span className="font-mono">
                        {isMixed
                            ? 'Mixed'
                            : hasColor
                                ? currentColor.toUpperCase()
                                : 'None'}
                    </span>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                            d={
                                expanded
                                    ? 'M7.5 6L5 3.5L2.5 6'
                                    : 'M2.5 4L5 6.5L7.5 4'
                            }
                            stroke={expanded ? '#C48B0A' : '#8a7d6b'}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>
            </div>

            {/* Expanded panel with full palette */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-2"
                    >
                        <div className="bg-[#F5F0E8] border border-[#DDD6C4] rounded-lg p-2.5 space-y-2">
                            {/* Selected color preview */}
                            <div className="flex items-center gap-1.5">
                                <div
                                    className="w-7 h-7 rounded-[6px] flex-shrink-0"
                                    style={{
                                        background: isMixed
                                            ? mixedSwatchBg
                                            : (currentColor ?? 'transparent'),
                                        border: '2px solid #C48B0A',
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-[#8a7d6b] mb-0.5">
                                        Selected
                                    </div>
                                    <div className="text-[11px] font-semibold text-[#1A1612] font-mono truncate">
                                        {isMixed
                                            ? 'Mixed'
                                            : (currentColor?.toUpperCase() ?? '—')}
                                    </div>
                                </div>
                                <button
                                    className="bg-[#FFFCF5] border border-[#C4B89A] rounded-[5px] p-1 flex-shrink-0 hover:bg-[#EDE7D7] transition-colors"
                                    onClick={() =>
                                        currentColor &&
                                        navigator.clipboard?.writeText(
                                            currentColor
                                        )
                                    }
                                    title="Copy hex"
                                >
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 12 12"
                                        fill="none"
                                    >
                                        <rect
                                            x="1"
                                            y="3"
                                            width="8"
                                            height="8"
                                            rx="1.5"
                                            stroke="#8a7d6b"
                                            strokeWidth="1.2"
                                        />
                                        <path
                                            d="M3 3V2a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1h-1"
                                            stroke="#8a7d6b"
                                            strokeWidth="1.2"
                                        />
                                    </svg>
                                </button>
                            </div>

                            {/* Full color grid: all shades + saved custom colors */}
                            <div className="flex flex-wrap gap-1">
                                {[...allColorShades, ...savedColors].map(
                                    (color, i) => (
                                        <button
                                            key={`${color}-${i}`}
                                            onClick={() =>
                                                handleColorSelect(color)
                                            }
                                            onContextMenu={(e) => {
                                                if (
                                                    savedColors.includes(color)
                                                ) {
                                                    e.preventDefault()
                                                    setRemovingColor(
                                                        removingColor === color
                                                            ? null
                                                            : color
                                                    )
                                                }
                                            }}
                                            title={color}
                                            className="relative w-[22px] h-[22px] rounded-[5px] flex-shrink-0 transition-transform hover:scale-110"
                                            style={swatchStyle(color)}
                                        >
                                            <AnimatePresence>
                                                {removingColor === color && (
                                                    <motion.span
                                                        initial={{
                                                            opacity: 0,
                                                            scale: 0.5,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            scale: 1,
                                                        }}
                                                        exit={{
                                                            opacity: 0,
                                                            scale: 0.5,
                                                        }}
                                                        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] leading-none"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleRemoveColor(
                                                                color
                                                            )
                                                        }}
                                                    >
                                                        ×
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </button>
                                    )
                                )}
                                <button
                                    onClick={handleSaveColor}
                                    title="Save current color"
                                    className="w-[22px] h-[22px] rounded-[5px] flex-shrink-0 flex items-center justify-center bg-[#F5F0E8] border-dashed border-[1.5px] border-[#C4B89A] hover:border-[#C48B0A] transition-colors"
                                >
                                    <svg
                                        width="10"
                                        height="10"
                                        viewBox="0 0 10 10"
                                        fill="none"
                                    >
                                        <path
                                            d="M5 2V8M2 5H8"
                                            stroke="#8a7d6b"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </button>
                            </div>

                            {/* Hex input */}
                            <div className="flex items-center gap-1.5">
                                <div
                                    className="w-5 h-5 rounded-[4px] flex-shrink-0 border border-[#C4B89A]"
                                    style={{
                                        background:
                                            currentColor ?? 'transparent',
                                    }}
                                />
                                <div className="flex-1 flex items-center bg-[#FFFCF5] border border-[#C4B89A] rounded-[5px] px-2 py-1 gap-1">
                                    <span className="text-[10px] text-[#8a7d6b] font-semibold">
                                        #
                                    </span>
                                    <input
                                        className="text-[11px] text-[#1A1612] font-mono font-medium bg-transparent outline-none w-full"
                                        value={hexInput}
                                        onChange={(e) =>
                                            setHexInput(
                                                e.target.value
                                                    .replace(
                                                        /[^0-9A-Fa-f]/g,
                                                        ''
                                                    )
                                                    .slice(0, 6)
                                            )
                                        }
                                        onBlur={handleHexSubmit}
                                        onKeyDown={(e) =>
                                            e.key === 'Enter' &&
                                            handleHexSubmit()
                                        }
                                        placeholder="3DB88A"
                                        maxLength={6}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Essential shades row — always visible */}
            <div className="flex items-center gap-1">
                {essentialShades.map((color) => (
                    <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        title={color}
                        className="mr-1 w-5 h-5 rounded-full flex-shrink-0 transition-transform hover:scale-110"
                        style={{
                            background: color,
                            border:
                                color === '#FFFFFF'
                                    ? '1.5px solid #1A1612'
                                    : 'none',
                            outline:
                                currentColor === color
                                    ? '2.5px solid #C48B0A'
                                    : 'none',
                            outlineOffset: '1.5px',
                        }}
                    />
                ))}
                <button
                    onClick={handleToggle}
                    title="Handle toggle"
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-dashed border-[1.5px] border-[#C4B89A] bg-[#F5F0E8] hover:border-[#C48B0A] transition-colors"
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                            d="M5 2V8M2 5H8"
                            stroke="#8a7d6b"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>
            </div>
        </Fragment>
    )
}

ColorPicker.propTypes = {
    currentColor: PropTypes.string,
    onChangeComplete: PropTypes.func,
    title: PropTypes.string,
    isExpanded: PropTypes.bool,
    onToggleExpand: PropTypes.func,
}

export default ColorPicker
