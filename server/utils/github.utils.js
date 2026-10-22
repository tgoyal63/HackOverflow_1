const { getRequest } = require('./common.utils.js');
const ServiceError = require('../errors/service.error.js');

const getGithubData = async (url) => {
  const response = await getRequest(url);
  if (response.status !== 200) throw new ServiceError(502, 'Github data unavailable.');
  return response.data;
};
const userUrl = (username, path) => `https://api.github.com/users/${encodeURIComponent(username)}/${path}`;

module.exports = {
  getOrganizations: (username) => getGithubData(userUrl(username, 'orgs')),
  getFollowers: (username) => getGithubData(userUrl(username, 'followers')),
  getFollowing: (username) => getGithubData(userUrl(username, 'following')),
  getRepositories: (username) => getGithubData(userUrl(username, 'repos')),
  getCommits: (username) => getGithubData(`https://api.github.com/search/commits?q=author:${encodeURIComponent(username)}`),
};
