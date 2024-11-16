class PdfJsRenderer {
    constructor(pdfUrl, pdfContainerDOMId) {
        this.url = pdfUrl;
        this.viewer = document.getElementById(pdfContainerDOMId);
        this.pageNumberElement = document.getElementsByClassName("currentPageNumber")[0];
        this.zoomLevelElement = document.getElementsByClassName("zoomLevel")[0];
        this.pageCountElement = document.getElementsByClassName("totalPageCount")[0];
        this.thePdf = {};
        this.zoomX = 1; // Zoom level is set to 100% by default
        this.totalPageCount = 0;
    }

    renderPdfViewer = async function () {
        // Create shortcut to access PDF.js exports.
        var { pdfjsLib } = globalThis;

        // The workerSrc property shall be specified, as per Pdf.js doc
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/lib/pdfjs/pdf.worker.min.js";
        
        // obtain document from given url
        this.thePdf = await pdfjsLib.getDocument(this.url).promise.then(function (pdf) {
            return pdf;            
        });

        if (this.thePdf.numPages > 0) {
            this.renderPdfCanvases();
        }
        let pdfRendererInstance = this;
        this.viewer.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    onZoomIn(pdfRendererInstance);
                }
                else if (e.deltaY >= 0) {
                    onZoomOut(pdfRendererInstance);
                }
            }
        });
    }

    renderPdfCanvases = function () {
        this.viewer.replaceChildren();
        this.zoomLevelElement.innerHTML = `${(this.zoomX * 100).toFixed(0)}%`;
        this.totalPageCount = this.thePdf.numPages;
        this.pageCountElement.innerHTML = this.totalPageCount;
        let pageStack = []; // resetting page stack

        // used for observing which page is visible in the viewport
        // This is required for showing current page number as continuous scroll is required.
        const intersectionObserver = new IntersectionObserver((entries) => {
            // If intersectionRatio is greater than 0, the target just came to view
            let thisPageNumber = entries[0].target.getAttribute("data-page-number");
            if (entries[0].intersectionRatio > 0) {
                pageStack.push(thisPageNumber);
            }
            else {
                let indexOfThisPage = pageStack.indexOf(thisPageNumber);
                if (indexOfThisPage > -1 && pageStack.length > 1) {
                    pageStack.splice(indexOfThisPage, 1);
                }
            }
            if (pageStack.length > 0) {
                this.pageNumberElement.innerHTML = pageStack[pageStack.length - 1];
            }
        });

        // Create a canvas per page and append to PDF container
        for (let pageNumber = 1; pageNumber <= this.totalPageCount; pageNumber++) {
            // canvas is wrapped inside a div so that 2 canvases won't appear in one line when zoomed out        
            let canvasContainer = document.createElement("div");
            let canvas = document.createElement("canvas");
            canvas.className = 'pdfPageCanvas';
            canvas.setAttribute('data-page-number', pageNumber);
            canvasContainer.appendChild(canvas);
            this.viewer.appendChild(canvasContainer);
            this.renderPage(pageNumber, canvas);
            // Attach intersection observer to show appropriate page number on scroll
            intersectionObserver.observe(canvas);
        }
    }
    renderPage = function (pageNumber, canvas) {
        let zoomX = this.zoomX;
        this.thePdf.getPage(pageNumber).then(function (page) {
            let viewport = page.getViewport({ scale: zoomX });
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport });
        });
    }    
}

document.addEventListener('DOMContentLoaded', async function () {
    let url = "https://arxiv.org/pdf/1706.03762";
    let pdfRenderer = new PdfJsRenderer(url, "pdfContainer");
    await pdfRenderer.renderPdfViewer();

    // Assign click events on zooming buttons
    document.getElementsByClassName('zoom-in')[0].addEventListener('click', onZoomIn.bind(null, pdfRenderer));
    document.getElementsByClassName('zoom-out')[0].addEventListener('click', onZoomOut.bind(null, pdfRenderer));
});

onZoomIn = function (pdfRenderer) {
    pdfRenderer.zoomX += 0.1;
    // render PDF canvases again with updated zoom level.
    pdfRenderer.renderPdfCanvases();
}

onZoomOut = function (pdfRenderer) {
    if (pdfRenderer.zoomX <= 0.1) {
        // to prevent zooming out to or beyond zero
        return;
    }
    pdfRenderer.zoomX -= 0.10;
    // render PDF canvases again with updated zoom level.
    pdfRenderer.renderPdfCanvases();
}