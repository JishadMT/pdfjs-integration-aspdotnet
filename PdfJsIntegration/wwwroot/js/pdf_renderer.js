document.addEventListener('DOMContentLoaded', function () {
    let url = "https://arxiv.org/pdf/1706.03762";
    renderPdfViewer(url, "pdfContainer", "pdfControlsContainer");
});

function renderPdfViewer(pdfUrl, pdfContainerDOMId, pdfControlsContainerDOMId) {
    var url = pdfUrl;
    let viewer = document.getElementById(pdfContainerDOMId);
    let controls = document.getElementById(pdfControlsContainerDOMId);
    let pageNumberElement = controls.getElementsByClassName("currentPageNumber")[0];
    let zoomLevelElement = controls.getElementsByClassName("zoomLevel")[0];
    let pageCountElement = controls.getElementsByClassName("totalPageCount")[0];

    // Create shortcut to access PDF.js exports.
    var { pdfjsLib } = globalThis;

    // The workerSrc property shall be specified, as per Pdf.js doc
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/lib/pdfjs/pdf.worker.min.js";
    
    let zoomX = 1; // Zoom level is set to 100% by default
    let totalPageCount = 0, pageStack = [];

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
            pageNumberElement.innerHTML = pageStack[pageStack.length - 1];
        }
    });

    // obtain document from given url
    pdfjsLib.getDocument(url).promise.then(function (pdf) {
        thePdf = pdf;
        if (thePdf.numPages > 0) {
            renderPdfCanvases();
            controls.classList.remove("d-none");
        }
    });

    // Create canvas for each page in the pdf
    function renderPdfCanvases() {
        viewer.replaceChildren();
        zoomLevelElement.innerHTML = `${(zoomX * 100).toFixed(0)}%`;
        totalPageCount = thePdf.numPages;
        pageCountElement.innerHTML = totalPageCount;
        pageStack = []; // resetting page stack

        // Create a canvas per page and append to PDF container
        for (let pageNumber = 1; pageNumber <= totalPageCount; pageNumber++) {
            // canvas is wrapped inside a div so that 2 canvases won't appear in one line when zoomed out        
            let canvasContainer = document.createElement("div");
            let canvas = document.createElement("canvas");
            canvas.className = 'pdfPageCanvas';
            canvas.setAttribute('data-page-number', pageNumber);
            canvasContainer.appendChild(canvas);
            viewer.appendChild(canvasContainer);
            renderPage(pageNumber, canvas);
            // Attach intersection observer to show appropriate page number on scroll
            intersectionObserver.observe(canvas);
        }
    }

    // render pdf page inside the given canvas
    function renderPage(pageNumber, canvas) {
        thePdf.getPage(pageNumber).then(function (page) {
            viewport = page.getViewport({ scale: zoomX });
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport });
        });
    }

    function onZoomIn() {
        zoomX += 0.1;
        // render PDF canvases again with updated zoom level.
        renderPdfCanvases();
    }

    function onZoomOut() {
        if (zoomX < 0.2) {
            // to prevent zooming out to or beyond zero
            return;
        }
        zoomX -= 0.10;
        // render PDF canvases again with updated zoom level.
        renderPdfCanvases();
    }

    // Assign click events on zooming buttons
    controls.getElementsByClassName('zoomIn')[0].addEventListener('click', onZoomIn);
    controls.getElementsByClassName('zoomOut')[0].addEventListener('click', onZoomOut);

    // Assign zoom functionsin response to mousewheel with Ctrl key pressed, inside the PDF viewer.
    viewer.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY > 0) {
                onZoomIn();
            }
            else if (e.deltaY < 0) {
                onZoomOut();
            }
        }
    });

}