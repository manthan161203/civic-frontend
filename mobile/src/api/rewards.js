import api from './client';

export const rewardsApi = {
  getMyRewards: () => api.get('/me/rewards'),
  getBadges: () => api.get('/badges'),
  citizenLeaderboard: (params) =>
    api.get('/leaderboard/citizens', { params }),
  workerLeaderboard: (params) =>
    api.get('/leaderboard/workers', { params }),
};
