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

export const generateRandomUsernames = () => {
    let names = [
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

    let rB = Math.floor(Math.random() * names.length)
    let name = names[rB]
    let firstName = name.split('_')[0]
    let lastName = name.split('_')[1]

    return { nickname: name, firstName, lastName }
}

export const generateUUID = () => {
    // Public Domain/MIT
    let d = new Date().getTime() //Timestamp
    let d2 =
        (typeof performance !== 'undefined' &&
            performance.now &&
            performance.now() * 1000) ||
        0 //Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        function (c) {
            let r = Math.random() * 16 //random number between 0 and 16
            if (d > 0) {
                //Use timestamp until depleted
                r = (d + r) % 16 | 0
                d = Math.floor(d / 16)
            } else {
                //Use microseconds since page-load if supported
                r = (d2 + r) % 16 | 0
                d2 = Math.floor(d2 / 16)
            }
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
        }
    )
}
