import React, { useContext } from 'react'
import { BoardContext } from 'views/Board/board'
import binIcon from 'assets/bin.svg'

const BottomToolbar = () => {
    const { clearBoard } = useContext(BoardContext)

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '16px',
                right: '16px',
                zIndex: 20,
            }}
        >
            <button
                title="Clear board"
                onClick={clearBoard}
                className="w-10 h-10 rounded-lg shadow-md bg-red-700 flex items-center justify-center hover:bg-red-500 transition-colors duration-150"
            >
                <img src={binIcon} className="w-5 h-5" alt="Clear board" />
            </button>
        </div>
    )
}

export default BottomToolbar
