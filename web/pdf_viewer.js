/* Copyright 2014 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getVisibleElements, scrollIntoView } from './ui_utils';
import { BaseViewer } from './base_viewer';
import { shadow } from 'pdfjs-lib';

const ScrollMode = {
  VERTICAL: 0, // The default value.
  HORIZONTAL: 1,
  GRID: 2,
  GRID_COVER: 3,
};

class PDFViewer extends BaseViewer {
  get _setDocumentViewerElement() {
    return shadow(this, '_setDocumentViewerElement', this.viewer);
  }

  _scrollIntoView({ pageDiv, pageSpot = null, }) {
    if (!pageSpot && this._isHorizontallyScrolling) {
      pageSpot = { left: 0, top: 0, };
    }
    scrollIntoView(pageDiv, pageSpot);
  }

  _getVisiblePages() {
    if (!this.isInPresentationMode) {
      return getVisibleElements(this.container, this._pages, true);
    }
    // The algorithm in getVisibleElements doesn't work in all browsers and
    // configurations when presentation mode is active.
    let currentPage = this._pages[this._currentPageNumber - 1];
    let visible = [{ id: currentPage.id, view: currentPage, }];
    return { first: currentPage, last: currentPage, views: visible, };
  }

  update() {
    let visible = this._getVisiblePages();
    let visiblePages = visible.views, numVisiblePages = visiblePages.length;

    if (numVisiblePages === 0) {
      return;
    }
    this._resizeBuffer(numVisiblePages);

    this.renderingQueue.renderHighestPriority(visible);

    let currentId = this._currentPageNumber;
    let stillFullyVisible = false;

    for (let i = 0; i < numVisiblePages; ++i) {
      let page = visiblePages[i];

      if (page.percent < 100) {
        break;
      }
      if (page.id === currentId) {
        stillFullyVisible = true;
        break;
      }
    }

    if (!stillFullyVisible) {
      currentId = visiblePages[0].id;
    }
    if (!this.isInPresentationMode) {
      this._setCurrentPageNumber(currentId);
    }

    this._updateLocation(visible.first);
    this.eventBus.dispatch('updateviewarea', {
      source: this,
      location: this._location,
    });
  }

  setScrollMode(mode) {
    this.viewer.classList.remove('scrollHorizontal', 'scrollGrid', 'coverPage');
    this._isHorizontallyScrolling = false;
    switch (mode) {
      case ScrollMode.HORIZONTAL:
        this._isHorizontallyScrolling = true;
        this.viewer.classList.add('scrollHorizontal');
        break;
      case ScrollMode.GRID_COVER:
        this.viewer.classList.add('coverPage');
        // fallthrough
      case ScrollMode.GRID:
        this.viewer.classList.add('scrollGrid');
        break;
    }
    this.eventBus.dispatch('scrollmodechanged', { mode, });
    this.scrollPageIntoView({ pageNumber: this._currentPageNumber, });
  }
}

export {
  PDFViewer,
  ScrollMode,
};
