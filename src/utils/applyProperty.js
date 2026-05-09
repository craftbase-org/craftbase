import { strokeTypeToDashes, clearDashesOnTwoJSShape } from './misc'

// Applies a property change to the relevant default and (if present) the
// currently-selected element. This is the single mutation path used by the
// unified element-properties toolbar.
//
// Property keys are toolbar-facing names:
//   fill, stroke, linewidth, strokeType, opacity,
//   textColor, textSize, textFontFamily
//
// strokeType values are the UI labels: 'solid' | 'dashed' | 'dotted'.
// Defaults store null for 'solid' (matches what primary.js feeds into new
// shapes); DB rows store the literal 'solid'/'dashed'/'dotted' string.
export function createApplyProperty(deps) {
    return function applyProperty(propertyKey, value) {
        const {
            // mode flags
            isPencilMode,
            // live state
            selectedComponent,
            twoJSInstance,
            // bulk store + history (undo records here)
            updateComponentBulkPropertiesInLocalStore,
            updateBulkPropsForRectangleWithText,
            // text-specific handlers (own resize-on-grow logic etc.)
            handleTextSizeChange,
            handleRectangleTextSizeChange,
            handleTextFontFamilyChange,
            handleRectangleTextFontFamilyChange,
            // default setters — shape set
            setDefaultFill,
            setDefaultStrokeColor,
            setDefaultLinewidth,
            setDefaultStrokeType,
            setDefaultOpacity,
            setDefaultTextColor,
            setDefaultTextSize,
            setDefaultTextFontFamily,
            // default setters — pencil set
            setPencilStrokeColor,
            setPencilDefaultLinewidth,
            setPencilDefaultStrokeType,
        } = deps

        // 1. Update the matching default.
        if (isPencilMode) {
            if (propertyKey === 'stroke') setPencilStrokeColor(value)
            else if (propertyKey === 'linewidth')
                setPencilDefaultLinewidth(value)
            else if (propertyKey === 'strokeType')
                setPencilDefaultStrokeType(value === 'solid' ? null : value)
        } else {
            if (propertyKey === 'fill') setDefaultFill(value)
            else if (propertyKey === 'stroke') setDefaultStrokeColor(value)
            else if (propertyKey === 'linewidth') setDefaultLinewidth(value)
            else if (propertyKey === 'strokeType')
                setDefaultStrokeType(value === 'solid' ? null : value)
            else if (propertyKey === 'opacity') setDefaultOpacity(value)
            else if (propertyKey === 'textColor') setDefaultTextColor(value)
            else if (propertyKey === 'textSize') setDefaultTextSize(value)
            else if (propertyKey === 'textFontFamily')
                setDefaultTextFontFamily(value)
        }

        // 2. If nothing is selected, we're done.
        if (!selectedComponent) return

        const id = selectedComponent?.group?.data?.elementData?.id
        if (!id) return

        const shapeType = selectedComponent?.shape?.type
        const isRectangleWithText =
            shapeType === 'rectangle' &&
            typeof selectedComponent?.text?.data?.value === 'string'

        // 3. Route text properties — these have their own bulky resize logic.
        if (propertyKey === 'textSize') {
            if (isRectangleWithText) handleRectangleTextSizeChange?.(value)
            else handleTextSizeChange?.(value)
            return
        }
        if (propertyKey === 'textFontFamily') {
            if (isRectangleWithText)
                handleRectangleTextFontFamilyChange?.(value)
            else handleTextFontFamilyChange?.(value)
            return
        }
        if (propertyKey === 'textColor') {
            if (isRectangleWithText) {
                if (selectedComponent?.text?.data)
                    selectedComponent.text.data.fill = value
                updateBulkPropsForRectangleWithText?.(id, { textColor: value })
            } else {
                if (selectedComponent?.shape?.data)
                    selectedComponent.shape.data.fill = value
                if (selectedComponent?.group?.data?.elementData) {
                    selectedComponent.group.data.elementData.textColor = value
                }
                updateComponentBulkPropertiesInLocalStore(id, {
                    textColor: value,
                })
            }
            twoJSInstance?.update()
            return
        }

        // 4. Non-text properties: apply via shape.data + sync elementData.
        const shapeData = selectedComponent?.shape?.data
        const elementData = selectedComponent?.group?.data?.elementData

        if (propertyKey === 'fill') {
            if (shapeData) shapeData.fill = value
            if (elementData) elementData.fill = value
            updateComponentBulkPropertiesInLocalStore(id, { fill: value })
        } else if (propertyKey === 'stroke') {
            if (shapeData) shapeData.stroke = value
            if (elementData) elementData.stroke = value
            updateComponentBulkPropertiesInLocalStore(id, { stroke: value })
        } else if (propertyKey === 'linewidth') {
            if (shapeData) shapeData.linewidth = value
            if (elementData) elementData.linewidth = value
            updateComponentBulkPropertiesInLocalStore(id, { linewidth: value })
        } else if (propertyKey === 'strokeType') {
            const dbValue = value === 'solid' ? 'solid' : value
            if (shapeData) {
                shapeData.dashes = strokeTypeToDashes(value)
                if (value === 'solid') clearDashesOnTwoJSShape(shapeData)
            }
            if (elementData) elementData.strokeType = dbValue
            updateComponentBulkPropertiesInLocalStore(id, {
                strokeType: dbValue,
            })
        } else if (propertyKey === 'opacity') {
            if (shapeData) shapeData.opacity = value
            const existingMeta = elementData?.metadata ?? {}
            const updatedMeta = { ...existingMeta, opacity: value }
            if (elementData) elementData.metadata = updatedMeta
            updateComponentBulkPropertiesInLocalStore(id, {
                metadata: updatedMeta,
            })
        }

        twoJSInstance?.update()
    }
}
