import { h } from "harmaja"
import * as L from "lonna"
import { Board } from "../../../common/src/domain"
import { signIn } from "../google-auth"
import { BoardAccessStatus } from "../store/board-store"
import { UserSessionState } from "../store/user-session-store"

export const BoardViewMessage = ({
    boardAccessStatus,
    sessionState,
    board,
}: {
    boardAccessStatus: L.Property<BoardAccessStatus>
    sessionState: L.Property<UserSessionState>
    board: L.Property<Board>
}) => {
    // TODO: login may be disabled due to Incognito mode or other reasons
    return L.combine(
        boardAccessStatus,
        L.view(board, "accessPolicy"),
        L.view(sessionState, "status"),
        (s: BoardAccessStatus, accessPolicy, sessionStatus) => {
            if (s === "not-found") {
                return (
                    <div className="board-status-message">
                        <div>
                            <p>Board not found. A typo, maybe?</p>
                        </div>
                    </div>
                )
            }
            if (s === "denied-permanently") {
                return (
                    <div className="board-status-message">
                        <div>
                            <p>
                                Sorry, access denied. Click <a onClick={signIn}>here</a> to sign in with another
                                account.
                            </p>
                        </div>
                    </div>
                )
            }
            if (s === "login-required") {
                if (sessionStatus === "login-failed") {
                    return (
                        <div className="board-status-message">
                            <div>
                                Something went wrong with logging in. Click <a onClick={signIn}>here</a> to try again.
                            </div>
                        </div>
                    )
                }

                return (
                    <div className="board-status-message">
                        <div>
                            This board is for authorized users only. Click <a onClick={signIn}>here</a> to sign in.
                        </div>
                    </div>
                )
            }

            const hasAccessPolicy = !!accessPolicy
            const notLoggedIn = sessionStatus !== "logged-in"
            if (s === "ready" && hasAccessPolicy && notLoggedIn) {
                // Currently the user will only be aware that this board has an access policy AND have 'ready' status,
                // while NOT being logged in, is if they have a local copy of the board stored.
                return (
                    <div className="board-status-message">
                        <div>
                            You are seeing a local copy of this board, because you are not signed in and this board is
                            access-restricted. Click <a onClick={signIn}>here</a> to sign in.
                        </div>
                    </div>
                )
            }

            return null
        },
    )
}
