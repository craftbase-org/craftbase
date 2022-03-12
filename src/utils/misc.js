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
