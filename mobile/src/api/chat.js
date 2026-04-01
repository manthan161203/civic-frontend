import api from './client';

export const chatApi = {
  send: (message, issue_id = null) =>
    api.post('/chat', { message, issue_id }),
};
