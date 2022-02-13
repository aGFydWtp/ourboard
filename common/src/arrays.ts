import { isArray, isEqual } from "lodash"

export function toArray<T>(x: T | T[]) {
    if (isArray(x)) return x
    return [x]
}

export function arrayIdMatch<T extends { id: string }>(a: T[] | T, b: T[] | T) {
    return arrayEquals(idsOf(a), idsOf(b))
}

export function idsOf<T extends { id: string }>(a: T[] | T): string[] {
    return toArray(a).map((x) => x.id)
}

export function arrayEquals<T>(a: T[] | T, b: T[] | T) {
    return isEqual(toArray(a), toArray(b))
}
