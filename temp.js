let sampleBoardData = {
    data: {
        components: [
            {
                id: '456e5b31-b7ec-4e1c-bdfc-13bc10aa5eeb',
                componentType: 'rectangle',
            },
            {
                id: 'c0738fa5-7769-406e-aa08-7860fc392cd3',
                componentType: 'circle',
            },
            {
                id: '416b6286-e936-42fd-bce4-fe168216eeef',
                componentType: 'rectangle',
            },
        ],
    },
}

/**
 * @typedef {Object} componentInfo
 * @property {object} metadata
 * @property {number} width
 * @property {number} height
 * @property {text} fill
 * @property {text} id
 * @property {text} stroke
 * @property {number} linewidth
 * @property {text} fill
 * @property {number} x
 * @property {number} y
 * @property {number} x1
 * @property {number} x2
 * @property {number} y1
 * @property {number} y2
 * @property {text} componentType
 * @property {object} children
 * @property {text} updatedBy
 * @property {text} iconStroke
 * @property {text} textColor
 */

/** @type {componentInfo} */
let componentInfo = {
    metadata: {},
    width: 120,
    height: 120,
    fill: '#0052CC',
    id: null,
    stroke: null,
    linewidth: null,
    x: 0,
    y: 0,
    x1: 100,
    x2: 400,
    y1: 100,
    y2: 100,
    componentType: '',
    children: {},
    updatedBy: null,
    iconStroke: null,
    textColor: null,
}
