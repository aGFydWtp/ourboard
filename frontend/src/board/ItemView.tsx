import { h } from "harmaja"
import * as L from "lonna"
import {
    AccessLevel,
    Board,
    canWrite,
    Connection,
    getAlign,
    getHorizontalAlign,
    getItemBackground,
    getItemShape,
    getVerticalAlign,
    isTextItem,
    Item,
    ItemType,
    TextItem,
} from "../../../common/src/domain"
import { emptySet } from "../../../common/src/sets"
import { HTMLEditableSpan } from "../components/HTMLEditableSpan"
import { Dispatch } from "../store/board-store"
import { autoFontSize } from "./autoFontSize"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus, getSelectedItemIds } from "./board-focus"
import { contrastingColor } from "./contrasting-color"
import { DragBorder } from "./DragBorder"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection"
import { ToolController } from "./tool-selection"
import { itemZIndex } from "./zIndices"

export const ItemView = ({
    board,
    accessLevel,
    id,
    type,
    item,
    isLocked,
    focus,
    coordinateHelper,
    latestConnection,
    dispatch,
    toolController,
}: {
    board: L.Property<Board>
    accessLevel: L.Property<AccessLevel>
    id: string
    type: ItemType
    item: L.Property<Item>
    isLocked: L.Property<boolean>
    focus: L.Atom<BoardFocus>
    coordinateHelper: BoardCoordinateHelper
    latestConnection: L.Property<Connection | null>
    dispatch: Dispatch
    toolController: ToolController
}) => {
    const element = L.atom<HTMLElement | null>(null)

    const ref = (el: HTMLElement) => {
        itemDragToMove(
            id,
            board,
            focus,
            toolController,
            coordinateHelper,
            latestConnection,
            dispatch,
            type === "container",
        )(el)
        element.set(el)
    }

    const { itemFocus, selected, onClick, onTouchStart } = itemSelectionHandler(
        id,
        type,
        focus,
        toolController,
        board,
        coordinateHelper,
        latestConnection,
        dispatch,
    )

    const dataTest = L.combineTemplate({
        text: L.view(item, (i) => (i.type === "note" || i.type === "text" ? i.text : "")),
        type: L.view(item, "type"),
        selected,
    }).pipe(
        L.map(({ text, selected, type }: { text: string; selected: boolean; type: ItemType }) => {
            const textSuffix = text ? "-" + text : ""
            return selected ? `${type}-selected${textSuffix}` : `${type}${textSuffix}`
        }),
    )

    function itemPadding(i: Item) {
        if (i.type != "note") return undefined

        const shape = getItemShape(i)
        return shape == "diamond"
            ? `${i.width / 4}em`
            : shape == "round"
            ? `${i.width / 8}em`
            : shape == "square" || shape == "rect"
            ? `${(i.fontSize || 1) / 3}em`
            : undefined
    }
    const shape = L.view(item, getItemShape)

    return (
        <span
            title={L.view(isLocked, (l) => (l ? "Item is selected by another user" : ""))}
            ref={ref}
            data-test={dataTest}
            data-itemid={id}
            draggable={L.view(itemFocus, (f) => f !== "editing")}
            onClick={onClick}
            onTouchStart={onTouchStart}
            className={L.view(
                selected,
                L.view(item, getItemBackground),
                isLocked,
                (s, b, l) =>
                    `${type} ${"color-" + b.replace("#", "").toLowerCase()} ${s ? "selected" : ""} ${
                        l ? "locked" : ""
                    }`,
            )}
            style={L.view(item, (i) => {
                return {
                    top: 0,
                    left: 0,
                    height: i.height + "em",
                    width: i.width + "em",
                    transform: `translate(${i.x}em, ${i.y}em)`,
                    zIndex: itemZIndex(i),
                    position: "absolute",
                    padding: itemPadding(i),
                    justifyContent: getJustifyContent(i),
                    alignItems: getAlignItems(i),
                    textAlign: getTextAlign(i),
                }
            })}
        >
            <span
                className={L.view(shape, (s) => "shape " + s)}
                style={L.view(item, (i) => {
                    return {
                        background: getItemBackground(i),
                    }
                })}
            />

            {(type === "note" || type === "text" || type === "container") && (
                <TextView item={item as L.Property<TextItem>} />
            )}

            {type === "container" && (
                <DragBorder {...{ id, board, toolController, coordinateHelper, latestConnection, focus, dispatch }} />
            )}
        </span>
    )

    function TextView({ item }: { item: L.Property<TextItem> }) {
        const textAtom = L.atom(L.view(item, "text"), (text) =>
            dispatch({ action: "item.update", boardId: board.get().id, items: [{ id, text }] }),
        )
        const showCoords = false
        const focused = L.view(focus, (f) => getSelectedItemIds(f).has(id))

        const setEditing = (e: boolean) => {
            if (toolController.tool.get() === "connect") return // Don't switch to editing in middle of connecting
            dispatch({ action: "item.front", boardId: board.get().id, itemIds: [id] })
            focus.set(
                e
                    ? { status: "editing", itemId: id }
                    : { status: "selected", itemIds: new Set([id]), connectionIds: emptySet() },
            )
        }
        const color = L.view(item, getItemBackground, contrastingColor)
        const fontSize = autoFontSize(
            item,
            L.view(item, (i) => (i.fontSize ? i.fontSize : 1)),
            L.view(item, "text"),
            focused,
            coordinateHelper,
            element,
        )
        return (
            <span
                className="text"
                onDoubleClick={(e) => e.stopPropagation()}
                style={L.combineTemplate({ fontSize, color })}
            >
                <HTMLEditableSpan
                    {...{
                        value: textAtom,
                        editingThis: L.atom(
                            L.view(itemFocus, (f) => f === "editing"),
                            setEditing,
                        ),
                        editable: L.view(accessLevel, canWrite),
                    }}
                />
                {showCoords && <small>{L.view(item, (p) => Math.floor(p.x) + ", " + Math.floor(p.y))}</small>}
            </span>
        )
    }
}

function getJustifyContent(item: Item) {
    if (isTextItem(item)) {
        switch (getHorizontalAlign(getAlign(item))) {
            case "left":
                return "flex-start"
            case "center":
                return "center"
            case "right":
                return "flex-end"
        }
    }
    return null
}

function getAlignItems(item: Item) {
    if (isTextItem(item)) {
        switch (getVerticalAlign(getAlign(item))) {
            case "top":
                return "flex-start"
            case "middle":
                return "center"
            case "bottom":
                return "flex-end"
        }
    }
    return null
}

function getTextAlign(item: Item) {
    if (isTextItem(item)) {
        return getHorizontalAlign(getAlign(item))
    }
    return null
}
