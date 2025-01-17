/*
 * Copyright (C) 2019 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import axios from 'axios';
import parseLinkHeader from "parse-link-header"
import _ from 'lodash'

let request

const once = (config = {}) => {
  if (request) {
    request.cancel("Only one request allowed at a time.");
  }
  request = axios.CancelToken.source();

  config.cancelToken = request.token
  return axios(config);
}

const ImageSearchActions = {

  updateSearchTerm(term) {
    return { type: 'UPDATE_SEARCH_TERM', term }
  },

  startImageSearch() {
    return { type: 'START_IMAGE_SEARCH' }
  },

  receiveImageSearchResults(originalResults) {
    const results = Object.assign({}, originalResults)
    results.prevUrl = parseLinkHeader(results.headers.link).prev ?
      parseLinkHeader(results.headers.link).prev.url : null
    results.nextUrl = parseLinkHeader(results.headers.link).next ?
      parseLinkHeader(results.headers.link).next.url : null
    return { type: 'RECEIVE_IMAGE_SEARCH_RESULTS', results }
  },

  clearImageSearch() {
    this.searchApiGet(null)
    return { type: 'CLEAR_IMAGE_SEARCH' }
  },

  failImageSearch(error) {
    return { type: 'FAIL_IMAGE_SEARCH', error }
  },

  cancelImageSearch() {
    if (request) {
      request.cancel()
    }
  },

  search(term) {
    return (dispatch) => {
      dispatch(this.updateSearchTerm(term))
      this.searchApiGet(this.composeSearchUrl(term), dispatch)
    }
  },

  loadMore(url) {
    return (dispatch) => {
      dispatch(this.startImageSearch())
      this.searchApiGet(url, dispatch)
    }
  },

  searchApiGet: _.debounce(function (url, dispatch=null) {
    this.cancelImageSearch();
    if (url===null) return
    dispatch(this.startImageSearch())

    const config = {
      method: "get",
      url: url,
      timeout: 60000
    }

    once(config).then(response => {
      dispatch(this.receiveImageSearchResults(response))
    }).catch((error) => {
      dispatch(this.failImageSearch(error))
    })
  }, 750),

  composeSearchUrl(term) {
    const per_page = '12';
    return `/api/v1/image_search/?query=${term}&per_page=${per_page}&orientation=landscape`
  }
}

export default ImageSearchActions
