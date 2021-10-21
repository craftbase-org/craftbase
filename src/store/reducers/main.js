import {
    CONSTRUCT,
    COMPLETE,
    ADD_ELEMENT,
    UNGROUP_ELEMENT,
    AREA_SELECTION,
    UPDATE_ELEMENT_DATA,
} from '../types'
import produce from 'immer'

const initialBoardData = [
    { id: 4, name: 'circle', data: { x: 272, y: 707, name: 'circle' } },
    { id: 6, name: 'rectangle', data: { x: 290, y: 430, name: 'rectangle' } },
    { id: 9, name: 'linkwithicon' },
]

const initial_state = {
    app: {},
    currentStatus: null,
    componentData: [],
    elementIDs: [],
    selectedComponents: [],
    lastAddedElement: {},
    getCoordGraph: {},
    boardData: [...initialBoardData],
}

export default (state = initial_state, action) =>
    produce(state, (draft) => {
        switch (action.type) {
            case CONSTRUCT:
                const newArr = action.payload.map((item) => item.elementId)
                console.log('action.payload construct', action.payload)
                const getCoordGraph = {}
                action.payload.forEach((item) => {
                    getCoordGraph[item.elementId] = item.data
                })

                return {
                    ...state,
                    currentStatus: 'construct',
                    getCoordGraph,
                    componentData: action.payload,
                    elementIDs: [...state.elementIDs, ...newArr],
                }

            case COMPLETE:
                const newItems = [...state.elementIDs]
                const elementId = action.payload.data.elementId
                newItems.push(elementId)
                return {
                    ...state,
                    currentStatus: 'complete',
                    elementIDs: newItems,
                    lastAddedElement: {},
                }

            case UPDATE_ELEMENT_DATA:
                console.log('action.payload', action.payload.data)
                let findId = state.componentData.findIndex(
                    (x) => x.elementId === action.payload?.elementId
                )
                console.log('update element data', findId)
                // if (findId !== -1) {
                //     draft.componentData[findId] = action.payload
                // }

                break

            case AREA_SELECTION:
                let x1Coord = action.payload.left
                let x2Coord = action.payload.right
                let y1Coord = action.payload.top
                let y2Coord = action.payload.bottom

                localStorage.setItem(
                    'groupobject_coordX',
                    parseInt(action.payload.x)
                )
                localStorage.setItem(
                    'groupobject_coordY',
                    parseInt(action.payload.y)
                )

                let xMid =
                    parseInt(action.payload.left) +
                    parseInt(action.payload.width / 2)
                let yMid =
                    parseInt(action.payload.top) +
                    parseInt(action.payload.height / 2)

                const newGroup = {}
                const newChildren = []
                const selectedComponentArr = []
                const allComponentCoords = Object.values(draft.getCoordGraph)
                console.log(
                    'area_selection allComponentCoords',
                    xMid,
                    yMid,
                    state.getCoordGraph
                )

                allComponentCoords.forEach((item, index) => {
                    console.log('item', item)
                    console.log(
                        'area_selection item.x',
                        item?.x,
                        ' x1Coord ',
                        x1Coord
                    )
                    console.log(
                        'area_selection item.x',
                        item?.x,
                        ' x2Coord ',
                        x2Coord
                    )
                    console.log(
                        'area_selection item.y',
                        item?.y,
                        ' y1Coord ',
                        y1Coord
                    )
                    console.log(
                        'area_selection item.y',
                        item?.y,
                        ' y1Coord ',
                        y2Coord
                    )
                    if (item !== undefined) {
                        console.log('area_selection item', item)
                        if (
                            item.x > x1Coord &&
                            item.x < x2Coord &&
                            item.y > y1Coord &&
                            item.y < y2Coord
                        ) {
                            console.log('area_selection a match')
                            let idToSelect = parseInt(
                                Object.keys(draft.getCoordGraph)[index]
                            )
                            selectedComponentArr.push(idToSelect)

                            let indexOfComponentArr =
                                draft.componentData.findIndex(
                                    (i) => i.elementId == idToSelect
                                )

                            draft.componentData.splice(indexOfComponentArr, 1)

                            let relativeX = item.x - xMid
                            let relativeY = item.y - yMid
                            console.log(
                                'relativeX relativeY',
                                relativeX,
                                relativeY,
                                indexOfComponentArr
                            )
                            let obj = {
                                id: idToSelect,
                                name: item.name,
                                x: relativeX,
                                y: relativeY,
                            }
                            newChildren.push(obj)
                        }
                    }
                })

                console.log('area_selection newChildren', newChildren)
                // newGroup.id = Math.floor(Math.random() * 9000) + 1000
                newGroup.name = 'groupobject'
                newGroup.width = action.payload.width
                newGroup.height = action.payload.height

                // Adding half width/height to x,y coords
                // due to selector rectangle being in inside
                // of selected area portion
                newGroup.x = action.payload.x + action.payload.width / 2
                newGroup.y = action.payload.y + action.payload.height / 2

                newGroup.children = newChildren

                draft.componentData.push(newGroup)
                draft.selectedComponents = selectedComponentArr

                break
                return {
                    ...state,
                    componentData: [...state.componentData],
                    selectedComponents: selectedComponentArr,
                }

            case ADD_ELEMENT:
                const newElementsData = [...state.componentData, action.payload]
                return {
                    ...state,
                    currentStatus: 'complete',
                    componentData: newElementsData,
                    lastAddedElement: action.payload,
                }

            case UNGROUP_ELEMENT:
                const groupToBeRemoved = action.payload.data.groupId
                const indexOfGroup = state.componentData.findIndex(
                    (x) => x.elementId === groupToBeRemoved
                )
                console.log(
                    'getIndexOf',
                    indexOfGroup,
                    action.payload,
                    state.componentData
                )

                const extractChildrenElements = [
                    ...state.componentData[indexOfGroup].children,
                ]

                state.componentData.splice(indexOfGroup, 1)
                const updatedElementsData = [
                    ...state.componentData,
                    ...extractChildrenElements,
                ]
                return {
                    ...state,
                    currentStatus: 'construct',

                    componentData: updatedElementsData,
                    lastAddedElement: action.payload,
                }

            default:
                return state
        }
    })
