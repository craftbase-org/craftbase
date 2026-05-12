import { Fragment, useState } from 'react'
import type { ReactElement } from 'react'

import AddSVG from '../../assets/add_icon_only.svg'
import SubtractSVG from '../../assets/subtract.svg'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any

interface CanvasZoomerProps {
    sceneInstance: TwoLike
    scene?: unknown
}

const CanvasZoomer = (props: CanvasZoomerProps): ReactElement => {
    const [scale, setScale] = useState(1)

    const handleZoomIn = (): void => {
        setScale(scale + 0.2)
        props.sceneInstance.scene.scale = scale + 0.2
        props.sceneInstance.update()
    }

    const handleZoomOut = (): void => {
        setScale(scale - 0.2)
        props.sceneInstance.scene.scale = scale - 0.2
        props.sceneInstance.update()
    }

    return (
        <Fragment>
            <div className="zoomer-container">
                <a
                    className="mr-2 cursor-pointer zoom-in-selector shadow-xl bg-white text-black rounded-full p-1"
                    onClick={handleZoomIn}
                >
                    <img width={40} height={40} src={AddSVG} alt="Zoom in" />
                </a>
                <a
                    className="cursor-pointer zoom-out-selector shadow-xl bg-white text-black rounded-full p-1"
                    onClick={handleZoomOut}
                >
                    <img
                        width={40}
                        height={40}
                        src={SubtractSVG}
                        alt="Zoom out"
                    />
                </a>
            </div>
        </Fragment>
    )
}

export default CanvasZoomer
