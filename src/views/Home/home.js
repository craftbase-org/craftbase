import React, { useEffect, useState } from 'react'
import { Redirect, useHistory } from 'react-router-dom'

import routes from 'routes'
import StickerSVG from 'assets/sticker.svg'
import TwitterLogoSVG from 'assets/twitter_logo.svg'
import GithubLogoSVG from 'assets/github_logo.svg'
import CraftbaseBoardScreenshotPNG from 'assets/craftbase_board_screenshot.png'
import Button from 'components/common/button'

const HomePage = (props) => {
    const [pageHeight, setPageHeight] = useState(0)
    const history = useHistory()

    useEffect(() => {
        console.log('window.innerHeight', window.innerHeight)
        setPageHeight(window.innerHeight - 200)
    }, [window.innerHeight])

    return (
        <>
            {/* <Redirect to={`/board/03a3706e-fe79-4df5-80f6-2f4040ade05f`} /> */}
            <div
                className="home-page-container"
                style={{ height: `${pageHeight}px` }}
            >
                <nav className="flex items-center w-full px-10 py-1 lg:py-2 2xl:py-4 h-20">
                    <div className="w-1/2 flex items-center ">
                        <div>
                            <img
                                src={StickerSVG}
                                className="w-6 h-6 
                            lg:w-8 lg:h-8
                            2xl:w-10 2xl:h-10
                            "
                            />
                        </div>
                        <div className="pl-2 text-primary-blue text-md lg:text-2xl 2xl:text-4xl">
                            craftbase
                        </div>
                    </div>
                    <div className="pl-5 w-1/2 flex items-center justify-between">
                        <div className="text-lg"></div>
                        <div className="pl-4">
                            <Button
                                intent="primary"
                                size="large"
                                label="Create Board"
                            />
                        </div>
                    </div>
                </nav>
                <div className="w-full h-full px-10 2xl:px-20 flex items-center ">
                    <div className="w-5/12 h-full flex items-center justify-center">
                        <div className="text-left">
                            <p className="text-base lg:text-3xl 2xl:text-5xl ">
                                Brainstorm your ideas into wireframes.
                            </p>
                            <p className="pt-4 text-sm lg:text-xl 2xl:text-3xl ">
                                Start creating wireframes with just one click.
                                Real-time updates across all devices, you can
                                share them with your colleagues by sending them
                                the board link
                            </p>
                        </div>
                    </div>
                    <div className="w-7/12 h-full flex items-center">
                        <div className="pl-4">
                            <img src={CraftbaseBoardScreenshotPNG} />
                        </div>
                    </div>
                </div>
                <footer
                    className=" fixed bottom-0 
                    w-full  px-10 2xl:px-20 
                     bg-neutrals-n40  h-20 shadow-inner
                flex items-center justify-between"
                >
                    <div>© 2022 Craftbase. All rights reserved.</div>
                    <div className=" flex items-center">
                        <a href="https://twitter.com/Meet_Zaveri">
                            <img className="w-6 h-6" src={TwitterLogoSVG} />
                        </a>
                        <a
                            className="pl-2"
                            href="https://github.com/craftbase-org"
                        >
                            <img className="w-7 h-7" src={GithubLogoSVG} />
                        </a>
                    </div>
                </footer>
            </div>
        </>
    )
}

export default HomePage
