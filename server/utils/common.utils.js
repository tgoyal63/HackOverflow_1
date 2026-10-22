const axios = require('axios');
const ControllerError = require('../errors/controller.error.js');
const ServiceError = require('../errors/service.error.js');

const request = async (config) => {
  try {
    return await axios({
      timeout: 10000,
      maxContentLength: 2 * 1024 * 1024,
      maxBodyLength: 2 * 1024 * 1024,
      maxRedirects: 2,
      validateStatus: () => true,
      ...config,
    });
  } catch (error) {
    // Never forward Axios errors: their config can contain upstream credentials.
    const timedOut = ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code);
    throw new ServiceError(timedOut ? 504 : 502,
      timedOut ? 'Social provider timed out.' : 'Social provider unavailable.');
  }
};

const CommonUtils = {
  generateResponse: (statusCode, message, data) => ({ statusCode, message, data }),
  customError: (status, msg) => ({ status, msg, isCustom: true }),
  removeDuplicateFromArray: (arr) => [...new Set(arr)],
  getRequest: (url, headers = { 'User-Agent': 'HackOverflow' }) => request({ method: 'get', url, headers }),
  getCodechefToken: async () => {
    if (!process.env.CODECHEF_CLIENT_ID || !process.env.CODECHEF_CLIENT_SECRET) {
      throw new ServiceError(503, 'Codechef integration unavailable.');
    }
    const response = await request({
      method: 'post',
      url: 'https://api.codechef.com/oauth/token',
      data: {
        client_id: process.env.CODECHEF_CLIENT_ID,
        client_secret: process.env.CODECHEF_CLIENT_SECRET,
        grant_type: 'client_credentials',
      },
    });
    const token = response.data?.result?.data?.access_token;
    if (response.status !== 200 || typeof token !== 'string' || !token) {
      throw new ServiceError(502, 'Codechef authentication unavailable.');
    }
    return token;
  },
  formatDate: (date) => {
    const d = new Date(date);
    return [d.getDate(), d.getMonth() + 1, d.getFullYear()].join('-');
  },
};

const getSocialData = async (social, username) => {
  if (!['github', 'hackerrank', 'codechef'].includes(social)) {
    throw new ControllerError(400, 'Unsupported social provider.');
  }
  if (typeof username !== 'string' || !username.trim()) {
    throw new ControllerError(400, 'Social username required.');
  }
  const handle = encodeURIComponent(username);
  const urls = {
    github: `https://api.github.com/users/${handle}`,
    hackerrank: `https://www.hackerrank.com/rest/contests/master/hackers/${handle}/profile`,
    codechef: `https://api.codechef.com/users/${handle}`,
  };
  const headers = social === 'codechef'
    ? { Authorization: `Bearer ${await CommonUtils.getCodechefToken()}` }
    : undefined;
  const response = await CommonUtils.getRequest(urls[social], headers);
  if ([200, 404].includes(response.status)) return response;
  if (social === 'github' && response.status === 403 && (
    response.headers?.['x-ratelimit-remaining'] === '0' ||
    /rate limit/i.test(response.data?.message || '')
  )) return { ...response, statusText: 'rate limit exceeded' };
  throw new ServiceError(502, 'Social provider unavailable.');
};

const checkAllSocials = async (socials) => {
  if (!socials) throw new ControllerError(400, 'Social usernames required.');
  for (const [social, label] of [['github', 'Github'], ['hackerrank', 'Hackerrank'], ['codechef', 'Codechef']]) {
    const response = await getSocialData(social, socials[social]);
    if (response.status === 404 || (social === 'codechef' && !response.data?.result)) {
      return { status: 404, value: label };
    }
    if (response.status !== 200) throw new ServiceError(503, `${label} validation unavailable.`);
  }
  return { status: 200 };
};

Object.freeze(CommonUtils);
module.exports = { getSocialData, checkAllSocials, ...CommonUtils };
