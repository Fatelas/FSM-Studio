/* eslint-disable @typescript-eslint/no-explicit-any */
import { App } from "./lib/viewer/App";
import { Viewer } from "./lib/viewer/Viewer";

export function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

export function JSONstringifyOrder(obj: any) {
    const allKeys = new Set();
    JSON.stringify(obj, (key, value) => (allKeys.add(key), value));
    return JSON.stringify(obj, (Array.from(allKeys).sort() as []));
}

export function createElementFromHTML(htmlString: string) {
    const div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return (div.firstChild as HTMLElement);
}

export function resizeCanvasToDisplaySize(container: HTMLElement, canvas: HTMLCanvasElement, hitcanvas: HTMLCanvasElement) {

    const needsResize =
        canvas.width !== container.clientWidth ||
        canvas.height !== container.clientHeight;

    if (needsResize) {

        const paddingLeft = parseInt(window.getComputedStyle(container).paddingLeft) || 0;
        const paddingRight = parseInt(window.getComputedStyle(container).paddingRight) || 0;
        const paddingTop = parseInt(window.getComputedStyle(container).paddingTop) || 0;
        const paddingBottom = parseInt(window.getComputedStyle(container).paddingBottom) || 0;

        canvas.width = container.clientWidth - paddingLeft - paddingRight;
        canvas.height = container.clientHeight - paddingTop - paddingBottom;
        hitcanvas.width = container.clientWidth - paddingLeft - paddingRight;
        hitcanvas.height = container.clientHeight - paddingTop - paddingBottom;

    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#212121';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

}

export function resizeViewers(app: App) {

    const viewers: Viewer[] = Object.values(app.viewers);
    const last = viewers.pop() as Viewer;

    if (last) {

        last.content.style.width = 'auto';
        last.content.style.height = 'auto';

        last.tabsWrapperElement.style.width = 'auto';

        last.element.style.display = 'flex';
        last.element.style.width = '0px';
        last.element.classList.add('editor-area');

    }

    for (const viewer of viewers) {

        const bounds = viewer.content.getBoundingClientRect();
        const width = bounds.width;

        if (width > 100) {

            viewer.content.style.width = `${width}px`;
            viewer.content.style.height = `${bounds.height}px`;

            viewer.tabsWrapperElement.style.width = `${width}px`;

            viewer.element.style.display = 'block';
            viewer.element.style.width = `${width}px`;
            viewer.element.classList.remove('editor-area');

        }

    }

}

export function prettifyXml(sourceXml: string) {
    const xmlDoc = new DOMParser().parseFromString(sourceXml, 'application/xml');
    const xsltDoc = new DOMParser().parseFromString([
        // describes how we want to modify the XML - indent everything
        '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:strip-space elements="*"/>',
        '  <xsl:template match="para[content-style][not(text())]">', // change to just text() to strip space in text nodes
        '    <xsl:value-of select="normalize-space(.)"/>',
        '  </xsl:template>',
        '  <xsl:template match="node()|@*">',
        '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
        '  </xsl:template>',
        '  <xsl:output indent="yes"/>',
        '</xsl:stylesheet>',
    ].join('\n'), 'application/xml');

    const xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDoc);
    const resultDoc = xsltProcessor.transformToDocument(xmlDoc);
    const resultXml = new XMLSerializer().serializeToString(resultDoc);
    return resultXml;
}

export function htmlDecode(input: string) {
    const e = document.createElement('textarea');
    e.innerHTML = input;
    // handle case of empty input
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}