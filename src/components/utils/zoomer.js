import React, { useState } from 'react'
import { useImmer } from 'use-immer'

import AddSVG from 'assets/add_icon_only.svg'
import SubtractSVG from 'assets/subtract.svg'

const CanvasZoomer = (props) => {
    const [scale, setScale] = useState(1)

    const handleZoomIn = (e) => {
        console.log('props.scene', props.scene)
        setScale(scale + 0.2)
        props.sceneInstance.scene.scale = scale + 0.2
        props.sceneInstance.update()
    }

    const handleZoomOut = (e) => {
        console.log('props.scene', props.scene)
        setScale(scale - 0.2)
        props.sceneInstance.scene.scale = scale - 0.2
        props.sceneInstance.update()
    }

    return (
        <React.Fragment>
            <div className="zoomer-container">
                <a
                    className="mr-2 cursor-pointer zoom-in-selector shadow-xl bg-white text-black rounded-full p-1"
                    onClick={handleZoomIn}
                >
                    <img width={40} height={40} src={AddSVG} />
                </a>
                <a
                    className="cursor-pointer zoom-out-selector shadow-xl bg-white text-black rounded-full p-1"
                    onClick={handleZoomOut}
                >
                    <img width={40} height={40} src={SubtractSVG} />
                </a>
            </div>
        </React.Fragment>
    )
}

export default CanvasZoomer
