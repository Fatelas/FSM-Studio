export class Point {
    x: number;
    y: number;

    constructor(x = 0, y = 0) {

        this.x = x;
        this.y = y;

    }

}

export function solveQuadratic(A: number, B: number, C: number) {

    const sqrt_val = (B * B) - (4 * A * C);

    if (sqrt_val >= 0) {

        return [
            (1 / (2 * A)) * (-B + Math.sqrt(sqrt_val)),
            (1 / (2 * A)) * (-B - Math.sqrt(sqrt_val))
        ]

    } else {

        throw new Error("No real roots.");

    }

}

export function isPointOnSegment(startPoint: Point, checkPoint: Point, endPoint: Point) {

    return ((endPoint.y - startPoint.y) * (checkPoint.x - startPoint.x)).toFixed(0) === ((checkPoint.y - startPoint.y) * (endPoint.x - startPoint.x)).toFixed(0) &&
        ((startPoint.x > checkPoint.x && checkPoint.x > endPoint.x) || (startPoint.x < checkPoint.x && checkPoint.x < endPoint.x)) &&
        ((startPoint.y >= checkPoint.y && checkPoint.y >= endPoint.y) || (startPoint.y <= checkPoint.y && checkPoint.y <= endPoint.y));


}

export type Line = {

    start: Point;
    end: Point;
    m: number;
    b: number;

}

export function line(start: Point, end: Point): Line {

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const m = dy / dx;
    const b = start.y - (m * start.x);

    return {
        start,
        end,
        m,
        b
    }

}

export function lineTest(testLine: Line, testEllipse: { xRadius: number; yRadius: number; }) {
    const m = testLine.m;
    const b = testLine.b;
    const A = testEllipse.xRadius;
    const B = testEllipse.yRadius;

    // ellipse = x^2/A^2 + y^2/B^2 = 1, line = mx + b = y
    // (B^2+A^2*m^2)x^2+(2*m*A^2*b)x+(A^2*b^2-A^2*B^2) = 0
    const val_1 = (B * B) + ((A * A) * (m * m));
    const val_2 = (2 * m * (A * A) * b);
    const val_3 = ((A * A) * (b * b) - (A * A) * (B * B));

    try {
        const points = solveQuadratic(val_1, val_2, val_3);

        const poinstInSegment = [];

        for (const x of points) {

            const p = new Point(x, m * x + b);

            if (isPointOnSegment(testLine.start, p, testLine.end)) {
                poinstInSegment.push(p);
            }

        }

        return { "result": true, "points": poinstInSegment };
    } catch (e) {
        return { "result": false, "points": [] };
    }
}

export function distance(p1: Point, p2: Point) {

    return Math.sqrt((Math.pow(p2.x - p1.x, 2)) + (Math.pow(p2.y - p1.y, 2)));

}

export function closest(target: Point, points: Point[]) {

    let min = Infinity;
    let closest = { x: 0, y: 0 };

    for (const point of points) {

        const dist = distance(target, point);

        if (dist < min) {
            min = dist;
            closest = point;
        }

    }

    return closest;

}