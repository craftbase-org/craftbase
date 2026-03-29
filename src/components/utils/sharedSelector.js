import Selector from 'components/utils/objectSelector'

let _instance = null
let _two = null

export function initSharedSelector(two) {
    _two = two
    _instance = new Selector(two, two.scene, 0, 0, 0, 0, 4)
    _instance.create()
    // Re-append areaGroup to scene end so it always renders on top of elements
    two.scene.remove(_instance.areaGroup)
    two.scene.add(_instance.areaGroup)
    // Hide by default
    _instance.hide()
}

export function updateSharedSelector(x1, x2, y1, y2) {
    if (!_instance) return
    // Keep selector on top each time it's shown (new elements may have been added since)
    _two.scene.remove(_instance.areaGroup)
    _two.scene.add(_instance.areaGroup)
    _instance.update(x1, x2, y1, y2)
}

export function hideSharedSelector() {
    if (!_instance) return
    _instance.hide()
    _two?.update()
}

export function getSharedSelectorInstance() {
    return _instance
}
