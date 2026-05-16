import type { RandomUsername } from '../types/board'

export function strokeTypeToDashes(strokeType: string | null | undefined): number[] {
    if (strokeType === 'dashed') return [8]
    if (strokeType === 'dotted') return [4]
    return []
}

// Two.js SVG renderer only sets stroke-dasharray when dashes.length > 0,
// but never removes the attribute when dashes = []. Call this after setting
// dashes = [] on a shape to ensure the SVG attribute is cleared.
//
// Typed loosely: the renderer-internal `_renderer.elem` lives on every Two.js
// Shape but isn't part of the published types we depend on here. Sharpen when
// Stages 7–9 converge on a canonical Two.js shape type.
export function clearDashesOnTwoJSShape(shape: {
    _renderer?: { elem?: SVGElement }
} | null | undefined): void {
    if (shape?._renderer?.elem) {
        shape._renderer.elem.removeAttribute('stroke-dasharray')
        shape._renderer.elem.removeAttribute('stroke-dashoffset')
    }
}

// elementOnBlurHandler is called from canvas event paths with raw DOM events
// and a Two.js instance. Internals are still JS — keep parameters loose.
export const elementOnBlurHandler = (
    e: FocusEvent | null | undefined,
    selectorInstance: { hide?: () => void } | null | undefined,
    two: { update: () => void }
): void => {
    const blurListenerCB = (innerEvent: FocusEvent): void => {
        const target = innerEvent?.relatedTarget as HTMLElement | null
        if (target?.dataset?.parent === 'floating-toolbar') {
            // no action required
        } else {
            selectorInstance?.hide?.()
        }
    }

    const related = e?.relatedTarget as HTMLElement | null
    if (
        related?.id === 'floating-toolbar' ||
        related?.dataset?.parent === 'floating-toolbar'
    ) {
        document
            .getElementById('floating-toolbar')
            ?.addEventListener('blur', blurListenerCB as EventListener)
    } else {
        selectorInstance?.hide?.()
    }
    two.update()
}

export const generateRandomUsernames = (): RandomUsername => {
    const names = [
        'cake_salad',
        'raspberry_waffle',
        'tropical_owl',
        'high_antopera',
        'banestick_watermelon',
        'zephyr_pomegranate',
        'optimus_prime',
        'network_tea',
        'floral_cake',
        'volcano_bee',
        'hurricane_cat',
        'juice_walrus',
        'groundhog_day',
        'spacex_dragon',
        'icecream_fox',
        'astronout_fly',
        'icecoffee_cat',
        'pumpkin_bat',
        'anonymous_galileo',
        'raspberry_cat',
        'water_rabbit',
        'violet_turtle',
    ]

    const rB = Math.floor(Math.random() * names.length)
    const name = names[rB]!
    const [firstName, lastName] = name.split('_') as [string, string]

    return { nickname: name, firstName, lastName }
}

export const generateUUID = (): string => {
    let d = new Date().getTime()
    let d2 =
        (typeof performance !== 'undefined' &&
            performance.now &&
            performance.now() * 1000) ||
        0
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        let r = Math.random() * 16
        if (d > 0) {
            r = ((d + r) % 16) | 0
            d = Math.floor(d / 16)
        } else {
            r = ((d2 + r) % 16) | 0
            d2 = Math.floor(d2 / 16)
        }
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
}
