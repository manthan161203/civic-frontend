/**
 * Rewards and leaderboards.
 *
 * @typedef {import('@civic/api-types').UserRewardSummary} UserRewardSummary
 * @typedef {import('@civic/api-types').BadgeDefinitionOut} BadgeDefinitionOut
 * @typedef {import('@civic/api-types').LeaderboardEntry} LeaderboardEntry
 */
import api from './client';

export const rewardsApi = {
  /** @returns {Promise<{ data: UserRewardSummary }>} */
  getMyRewards: () => api.get('/me/rewards'),
  getBadges: () => api.get('/badges'),
  citizenLeaderboard: (params) =>
    api.get('/leaderboard/citizens', { params }),
  workerLeaderboard: (params) =>
    api.get('/leaderboard/workers', { params }),
};
