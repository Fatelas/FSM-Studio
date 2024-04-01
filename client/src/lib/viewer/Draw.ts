import { Point, line, lineTest } from "./Math";

export function drawEllipseByCenter(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
    drawEllipse(ctx, cx - w / 2.0, cy - h / 2.0, w, h);
}

export function drawEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const kappa = .5522848,
        ox = (w / 2) * kappa, // control point offset horizontal
        oy = (h / 2) * kappa, // control point offset vertical
        xe = x + w,           // x-end
        ye = y + h,           // y-end
        xm = x + w / 2,       // x-middle
        ym = y + h / 2;       // y-middle

    ctx.beginPath();
    ctx.moveTo(x, ym);
    ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
    ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
    ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
    ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
    ctx.fill();
    ctx.stroke();
}

const pointFromCache = { x: 0, y: 0 };
const pointToCache = { x: 0, y: 0 };

export function arrowTo(from: { x: number; y: number; w: number; h: number; }, to: { x: number; y: number; w: number; h: number; }) {

    const fromintersect = lineTest(
        line(
            { x: from.x - from.x, y: from.y - from.y },
            { x: to.x - from.x, y: to.y - from.y }
        ),
        {
            xRadius: from.w / 2,
            yRadius: from.h / 2
        }
    )

    const pointFrom = fromintersect.points[0] || pointFromCache;

    const tointersect = lineTest(
        line(
            { x: from.x - to.x, y: from.y - to.y },
            { x: to.x - to.x, y: to.y - to.y }
        ),
        {
            xRadius: to.w / 2,
            yRadius: to.h / 2
        }
    )

    const pointTo = tointersect.points[0] || pointToCache;


    return {

        from: {
            x: from.x + pointFrom.x,
            y: from.y + pointFrom.y,
        },

        to: {
            x: to.x + pointTo.x,
            y: to.y + pointTo.y
        }

    }

}

export function drawLine(ctx: CanvasRenderingContext2D, from: Point, to: Point) {

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

}

export function drawArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point) {

    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
        to.x - 10 * Math.cos(angle - Math.PI / 6),
        to.y - 10 * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        to.x - 10 * Math.cos(angle + Math.PI / 6),
        to.y - 10 * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

}