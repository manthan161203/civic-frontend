/**
 * AI assistant.
 *
 * @typedef {import('@civic/api-types').ChatRequest} ChatRequest
 * @typedef {import('@civic/api-types').ChatResponse} ChatResponse
 */
import api from './client';

export const chatApi = {
  send: (message, issue_id = null) =>
    api.post('/chat', { message, issue_id }),
};
