import React, { useEffect, useState } from 'react'
import { Redirect, useHistory } from 'react-router-dom'
import { useMutation } from '@apollo/client'

import { INSERT_USER_ONE, CREATE_BOARD } from 'schema/mutations'
import routes from 'routes'
import StickerSVG from 'assets/sticker.svg'
import TwitterLogoSVG from 'assets/twitter_logo.svg'
import GithubLogoSVG from 'assets/github_logo.svg'
import ImageContainer from 'components/ProgressiveImageLoader/loader'
import CraftbaseBoardScreenshotPNG from 'assets/craftbase_board_screenshot.png'
import CraftbaseBoardScreenshotBlurJPG from 'assets/blur_craftbase_screenshot.jpg'
import Button from 'components/common/button'
import ModalContainer from 'components/common/modalContainer'
import { generateRandomUsernames } from 'utils/misc'

import './index.css'

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
    const history = useHistory()

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

    useEffect(() => {
        if (createBoardData) {
            const boardId = createBoardData.board.id
            console.log('createBoardData', createBoardData)
            history.push(`/board/${boardId}`)
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
                className="home-page-container"
                style={{ height: `${pageHeight}px` }}
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
                                history.push(`/board/${lastOpenBoard}`)
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
                        <div
                            className="pl-2 
                        text-primary-blue text-md lg:text-2xl 2xl:text-4xl font-bold"
                        >
                            craftbase
                        </div>
                    </div>
                    <div className="pl-5 w-1/2 flex items-center justify-between">
                        <div className="text-lg"></div>
                        <div className="pl-4">
                            <Button
                                intent="primary"
                                size="large"
                                name="create_board"
                                label="Create Board"
                                onClick={onCreateBoard}
                                extendClass="font-semibold shadow-lg"
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
                <div className="w-full h-full px-10 2xl:px-20 flex items-center ">
                    <div className="w-5/12 h-full flex items-center justify-center">
                        <div className="text-left transition-opacity duration-300 ease-in-out">
                            <p className="text-base lg:text-3xl 2xl:text-5xl font-bold ">
                                Brainstorm your ideas with{' '}
                                <span className=" text-primary-blue border-b-2 border-primary-blue ">
                                    craftbase
                                </span>
                            </p>
                            <p className="pt-4 text-sm lg:text-xl 2xl:text-3xl ">
                                Craftbase is an online whiteboard tool. You can
                                create diagrams or wireframes or brainstorm with
                                you peers with just one click.
                            </p>
                            <p className="pt-4 text-sm lg:text-xl 2xl:text-3xl ">
                                Real-time updates across all devices, you can
                                share them with your colleagues by sending them
                                the wireframe link
                            </p>
                            <div className="mt-4">
                                <Button
                                    intent="primary"
                                    name="start_now"
                                    label="Create Board - no signup needed"
                                    size="large"
                                    onClick={onCreateBoard}
                                    extendClass="font-semibold shadow-lg"
                                    loading={
                                        btnId === 'start_now' &&
                                        (insertUserLoading ||
                                            createBoardLoading)
                                    }
                                    disabled={
                                        insertUserLoading || createBoardLoading
                                    }
                                />
                            </div>
                        </div>
                    </div>
                    <div className="w-7/12 h-full flex items-center">
                        <div className="pl-4 w-full  ">
                            <ImageContainer
                                src={CraftbaseBoardScreenshotPNG}
                                thumb={CraftbaseBoardScreenshotBlurJPG}
                                height={382}
                                width={775}
                                alt={'screenshot'}
                                url={''}
                            />
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
