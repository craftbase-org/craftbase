export const elementOnBlurHandler = (e, selectorInstance, two) => {
    // Callback for add and remove event listener for floating showToolbar
    const blurListenerCB = (e) => {
        if (e?.relatedTarget?.dataset.parent === 'floating-toolbar') {
            // no action required
        } else {
            selectorInstance && selectorInstance.hide()
            // toggleToolbar(false);
        }
    }

    // Check if user interacts with toolbar
    if (
        e?.relatedTarget?.id === 'floating-toolbar' ||
        e?.relatedTarget?.dataset.parent === 'floating-toolbar'
    ) {
        document
            .getElementById('floating-toolbar')
            .addEventListener('blur', blurListenerCB)
    } else {
        selectorInstance && selectorInstance.hide()
        // toggleToolbar(false);
    }
    two.update()
}
