import React, { useEffect, useState } from 'react'
import { Redirect, useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'

import { INSERT_USER_ONE, CREATE_BOARD } from 'schema/mutations'
import routes from 'routes'
import StickerSVG from 'assets/sticker.svg'
import TwitterLogoSVG from 'assets/twitter_logo.svg'
import GithubLogoSVG from 'assets/github_logo.svg'
import RightArrowWhiteSVG from 'assets/right_arrow_white.svg'
import CustomizeSVG from 'assets/customize.svg'
import NoSignupSVG from 'assets/no_signup.svg'
import BlueStarSVG from 'assets/blue_star.svg'

// import ImageContainer from 'components/ProgressiveImageLoader/loader'
// import CraftbaseBoardScreenshotPNG from 'assets/craftbase_board_screenshot.png'
// import CraftbaseBoardScreenshotBlurJPG from 'assets/blur_craftbase_screenshot.jpg'
import HomeShapeToolbarJPG from 'assets/home_shape_toolbar.png'
import RadioCheckboxPNG from 'assets/radio_check.png'
import BasicShapesPNG from 'assets/basic_shapes.png'
import Button from 'components/common/button'
import ModalContainer from 'components/common/modalContainer'
import { generateRandomUsernames } from 'utils/misc'

const HomePage = (props) => {
    const lastOpenBoard = localStorage.getItem('lastOpenBoard')
    const [showLastOpenBoardModal, setShowLastOpenBoardModal] = useState(false)
    // create user mutation
    const [
        insertUser,
        {
            loading: insertUserLoading,
            data: insertUserData,
            error: insertUserError,
            reset: resetInsertUserMutation,
        },
    ] = useMutation(INSERT_USER_ONE)

    // create board mutation
    const [
        createBoard,
        {
            loading: createBoardLoading,
            data: createBoardData,
            error: createBoardError,
            reset: resetCreateBoardMutation,
        },
    ] = useMutation(CREATE_BOARD)

    const [pageHeight, setPageHeight] = useState(0)
    const [btnId, setBtnId] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        console.log('window.innerHeight', window.innerHeight)
        setPageHeight(window.innerHeight - 200)
        lastOpenBoard !== null && setShowLastOpenBoardModal(true)
    }, [window.innerHeight])

    useEffect(() => {
        if (insertUserData) {
            const userId = insertUserData.user.id
            console.log('insertUserData', insertUserData)
            localStorage.setItem('userId', userId)
            // createBoard({
            //     variables: {
            //         object: {
            //             createdBy: userId,
            //         },
            //     },
            // })
            // resetInsertUserMutation()
        }
    }, [insertUserData])

    // we listen for create board mutation success and trigger navigation
    useEffect(() => {
        if (createBoardData) {
            const boardId = createBoardData.board.id
            console.log('createBoardData', createBoardData)
            navigate(`/board/${boardId}`)
            // resetCreateBoardMutation()
        }
    }, [createBoardData])

    const onCreateBoard = (e) => {
        setBtnId(e.target.name)
        const userId = localStorage.getItem('userId')
        if (userId === null) {
            const { nickname, firstName, lastName } = generateRandomUsernames()
            insertUser({
                variables: {
                    object: {
                        nickname,
                        firstName,
                        lastName,
                    },
                },
            })
        }
        createBoard({
            variables: {
                object: {
                    createdBy: userId,
                },
            },
        })
    }

    const closeLastOpenBoardModal = () => {
        setShowLastOpenBoardModal(false)
    }

    return (
        <>
            {/* <Redirect to={`/board/03a3706e-fe79-4df5-80f6-2f4040ade05f`} /> */}
            <div
                className="home-page-container relative bg-neutrals-n20 "
                // style={{ height: `${pageHeight}px` }}
            >
                {/* <ModalContainer
                    showModal={showLastOpenBoardModal}
                    closeModal={closeLastOpenBoardModal}
                >
                    <div className="text-xl">
                        Do you want to continue on your last board ?
                    </div>
                    <div className="mt-4 flex items-center justify-center ">
                        <Button
                            intent="primary"
                            label="Yes"
                            size="large"
                            onClick={() => {
                                navigate.push(`/board/${lastOpenBoard}`)
                            }}
                        />
                        <Button
                            extendClass="ml-4"
                            intent="secondary"
                            label="No"
                            size="large"
                            onClick={closeLastOpenBoardModal}
                        />
                    </div>
                </ModalContainer> */}
                <nav
                    className="flex items-center w-full px-5 py-1 lg:py-2 2xl:py-4
                 bg-white shadow-md
                 "
                >
                    <div className="w-1/2 flex items-center ">
                        <div>
                            <img
                                src={StickerSVG}
                                className="w-4 h-4 
                            lg:w-6 lg:h-6
                            2xl:w-8 2xl:h-8
                            "
                            />
                        </div>
                        <div
                            className="pl-2 
                        text-primary-blue text-base lg:text-xl 2xl:text-2xl font-bold"
                        >
                            craftbase
                        </div>
                        <div className="text-primary-blue pl-2 text-sm">
                            {' '}
                            (still in early alpha stage)
                        </div>
                    </div>

                    <div className="pl-5 w-1/2 flex items-center justify-end ">
                        <div className="pl-4 flex items-center ">
                            <div className=" flex items-center">
                                <a href="https://twitter.com/craftbase_org">
                                    <img
                                        className="w-5 h-5"
                                        src={TwitterLogoSVG}
                                    />
                                </a>
                                <a
                                    className="pl-2"
                                    href="https://github.com/craftbase-org"
                                >
                                    <img
                                        className="w-6 h-6"
                                        src={GithubLogoSVG}
                                    />
                                </a>
                            </div>

                            <Button
                                intent="primary"
                                size="medium"
                                name="create_board"
                                label="Create Board"
                                onClick={onCreateBoard}
                                extendClass="font-semibold shadow-lg ml-4"
                                loading={
                                    btnId === 'create_board' &&
                                    (insertUserLoading || createBoardLoading)
                                }
                                disabled={
                                    insertUserLoading || createBoardLoading
                                }
                            />
                        </div>
                    </div>
                </nav>

                <div className="px-10 desktop:px-20 big-desktop:px-32 ultra-desktop:px-40">
                    <div
                        className="w-full
                        h-full mt-16
                        flex items-center  flex-wrap"
                    >
                        <div className="w-full lg:w-5/12 h-full flex items-center justify-center">
                            <div className="text-left transition-opacity duration-300 ease-in-out">
                                <p className="text-base lg:text-3xl 2xl:text-4xl font-bold ">
                                    Online whiteboarding tool for creative
                                    people.
                                </p>
                                <p className="pt-4 2xl:pt-8 text-sm lg:text-lg 2xl:text-xl ">
                                    Craftbase is online whiteboarding tool where
                                    user(s) can brainstorm using various objects
                                    such as shapes, pencil and to name a few,
                                    with themselves as well share it with other
                                    users.
                                </p>
                                {/* <p className="pt-4 2xl:pt-8 text-sm lg:text-lg 2xl:text-xl ">
                                    With real-time updates across all devices,
                                    you can collaborate with your peers in
                                    real-time just by sharing them the board
                                    link.
                                </p> */}
                                <div className="mt-4">
                                    <Button
                                        intent="primary"
                                        name="start_now"
                                        // label="Let's create board"

                                        size="large"
                                        onClick={onCreateBoard}
                                        extendClass="font-semibold shadow-lg primary-btn-home hover:shadow-xl"
                                        loading={
                                            btnId === 'start_now' &&
                                            (insertUserLoading ||
                                                createBoardLoading)
                                        }
                                        disabled={
                                            insertUserLoading ||
                                            createBoardLoading
                                        }
                                    >
                                        <div className="flex items-center">
                                            <span>Let's create board</span>
                                            <img
                                                className="ml-2 home-arrow-icon w-6 h-6"
                                                src={RightArrowWhiteSVG}
                                            />
                                        </div>
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="w-full lg:w-7/12 pt-8 lg:pt-0 h-full ">
                            <div className="lg:pl-4 home-page-main-video w-full flex items-center lg:justify-end justify-center ">
                                <iframe
                                    title="vimeo-player"
                                    src="https://player.vimeo.com/video/701362448?h=3b8bc751b0"
                                    className=" w-full lg:w-11/12"
                                    height="345"
                                    frameborder="0"
                                    allowfullscreen
                                    style={{ zIndex: '1 !important' }}
                                ></iframe>

                                {/* <ImageContainer
                                src={CraftbaseBoardScreenshotPNG}
                                thumb={CraftbaseBoardScreenshotBlurJPG}
                                height={382}
                                width={775}
                                alt={'screenshot'}
                                url={''}
                            /> */}
                            </div>
                        </div>
                    </div>

                    <div className="mt-20">
                        <div className="w-full flex  flex-wrap">
                            <div className="w-full sm:w-1/3">
                                <div>
                                    <img
                                        src={NoSignupSVG}
                                        className="w-10 h-10 big-desktop:w-14 big-desktop:h-14 mx-auto"
                                    />
                                </div>
                                <div className=" px-8 lg:px-20 big-desktop:text-lg">
                                    <p className="mt-4 text-primary-blue font-bold">
                                        No sign-up(s) needed
                                    </p>
                                    <p className="mt-2">
                                        Create as many boards you want without
                                        registering or signing up on platform.
                                    </p>
                                </div>
                            </div>
                            <div className="w-full sm:w-1/3 pt-8 sm:pt-0">
                                <div>
                                    <img
                                        src={BlueStarSVG}
                                        className="w-10 h-10 big-desktop:w-14 big-desktop:h-14 mx-auto"
                                    />
                                </div>
                                <div className=" px-8 lg:px-20 big-desktop:text-lg">
                                    <p className="mt-4 text-primary-blue font-bold">
                                        Open Source at its core
                                    </p>
                                    <p className="mt-2">
                                        We beleive in open code. Contribute to
                                        grow this project or download the source
                                        code, tweak and customize it for your
                                        needs.
                                    </p>
                                </div>
                            </div>
                            <div className="w-full sm:w-1/3 pt-8 sm:pt-0">
                                <div>
                                    <img
                                        src={CustomizeSVG}
                                        className="w-10 h-10 big-desktop:w-14 big-desktop:h-14 mx-auto"
                                    />
                                </div>
                                <div className=" px-8 lg:px-20 big-desktop:text-lg">
                                    <p className="mt-4 text-primary-blue font-bold">
                                        Customization
                                    </p>
                                    <p className="mt-2">
                                        We are constantly updating to make it
                                        more customizable than ever
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 w-full flex items-center justify-center">
                        <hr className="border border-neutrals-n80 w-2/4" />
                    </div>

                    <div className="mt-20 mb-20">
                        <div className="text-2xl font-medium">
                            We are still in early alpha stage. Show your support
                            by giving a star to our{' '}
                            <a
                                className="text-primary-blue underline"
                                href="https://github.com/craftbase-org"
                                target="_blank"
                            >
                                Github
                            </a>{' '}
                            repo or by giving us a follow on{' '}
                            <a
                                className="text-primary-blue underline"
                                href="https://twitter.com/craftbase_org"
                                target="_blank"
                            >
                                Twitter
                            </a>{' '}
                        </div>
                    </div>

                    {/* <div className="mt-8">
                    <div className="font-bold text-2xl">Support and Help</div>

                    <div className="mt-4">
                        Please contact{' '}
                        <a href="mailto:meetzaveri96@gmail.com">
                            meetzaveri96@gmail.com
                        </a>
                    </div>
                </div> */}

                    {/* <div className="mt-8 pt-20"> </div> */}
                </div>
                <footer
                    className="  
                    w-full  px-10 2xl:px-20 
                     bg-neutrals-n40  h-20 shadow-inner
                flex items-center justify-between"
                >
                    <div className="text-sm big-desktop:text-base">
                        © 2026 Craftbase. All rights reserved.
                    </div>
                    <div className=" flex items-center">
                        <a href="https://twitter.com/craftbase_org">
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
