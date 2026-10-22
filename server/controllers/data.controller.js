// Importing File Dependencies
const { controllerBoilerPlate, controllerResponse } = require('../utils/controller.utils.js');
const ControllerError = require('../errors/controller.error.js');
const ServiceError = require('../errors/service.error.js');
const { getRequest, getSocialData, formatDate } = require('../utils/common.utils.js');
const githubUtils = require('../utils/github.utils.js');

module.exports = {

  socialCheck: ('/check/:social', controllerBoilerPlate(async (req) => {
    const { username } = req.body;
    const { social } = req.params;
    const data = await getSocialData(social, username);
    if (data.status === 200) {
      return controllerResponse(201, 'Successful', { isExist: true });
    }
    if (data.status === 404) throw new ControllerError(404, 'User not found!');
    throw new ControllerError(503, 'Social validation unavailable.');
  })),

  github: (['/github', '/github/:username'], controllerBoilerPlate(async (req) => {
    let username = req.params.username;
    if (username === "" || !username) {
      username = req.user.socials.github;
    }
    const baseData = {
      // [![Ashutosh's github activity graph](https://github-readme-activity-graph.vercel.app/graph?username=tgoyal63&bg_color=ffcfe9&color=9e4c98&line=9e4c98&point=403d3d&area=true&hide_border=true)](https://github.com/ashutosh00710/github-readme-activity-graph)
      graph: `https://github-readme-activity-graph.vercel.app/graph?username=${encodeURIComponent(username)}&bg_color=17171F&color=FF6666&line=FFFFFF&point=FF6666&area=true&hide_border=true`,
      stats: `https://github-readme-stats.vercel.app/api?username=${encodeURIComponent(username)}&show_icons=true&hide_border=true&bg_color=17171F&title_color=FF6666&text_color=FFFFFF&icon_color=FF6666`,
      mul: `https://github-readme-stats.vercel.app/api/top-langs/?username=${encodeURIComponent(username)}&layout=compact&bg_color=17171F&title_color=FF6666&text_color=FFFFFF&hide_border=true&card_width=400`,
      contributions: `https://github-readme-streak-stats.herokuapp.com/?user=${encodeURIComponent(username)}&hide_border=true&sideNums=FFFFFF&background=17171F&currStreakNum=FFFFFF&fire=FF6666&sideLabels=FF6666&dates=FFFFFF&ring=FF6666&stroke=FF6666&currStreakLabel=FF6666`,
      githubUsername: username,
    }
    const data = await getSocialData("github", username);
    if (data.status === 404)
      throw new ControllerError(404, 'User not found!');
    else if (data.status === 403 && data.statusText === 'rate limit exceeded')
      return controllerResponse(200, 'Github API Rate Limit exceeded!',baseData);
    const github = data.data;
    const organizations = await githubUtils.getOrganizations(username);
    if (!github || !Array.isArray(organizations))
      throw new ServiceError(502, 'Github data unavailable.');
    const githubData = {
      public_repos: github.public_repos,
      public_gists: github.public_gists,
      followers: github.followers,
      following: github.following,
      organizations: organizations.length,
      github_created_at: formatDate(github.created_at),
      ...baseData
    };
    return controllerResponse(201, 'Successful', githubData);
  })),

  hackerrank: (['/hackerrank', '/hackerrank/:username'], controllerBoilerPlate(async (req) => {
    let username = req.params.username;
    if (username === "" || !username) {
      username = req.user.socials.hackerrank;
    }
    const data = (await getSocialData("hackerrank", username));
    if (data.status === 404)
      throw new ControllerError(404, 'User not found!');
    const submissionsUrl = `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/submission_histories`;
    const badgesUrl = `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/badges`;
    const submissionsResponse = await getRequest(submissionsUrl);
    const badgesResponse = await getRequest(badgesUrl);
    const submissions = submissionsResponse.data;
    const badges = badgesResponse.data?.models;
    const profile = data.data?.model;
    if (submissionsResponse.status !== 200 || badgesResponse.status !== 200 ||
      !submissions || typeof submissions !== 'object' || Array.isArray(submissions) ||
      !Array.isArray(badges) || !profile)
      throw new ServiceError(502, 'Hackerrank data unavailable.');
    const values = Object.values(submissions).map(Number);
    if (values.some((value) => !Number.isFinite(value) || value < 0))
      throw new ServiceError(502, 'Hackerrank data unavailable.');
    const totalSubmissions = values.reduce((total, value) => total + value, 0);
    return controllerResponse(201, 'Successful', {
      hackerrankUsername: profile.username,
      hackerrank_created_at: formatDate(profile.created_at),
      level: profile.level,
      followers_count: profile.followers_count,
      totalSubmissions,
      totalBadges: badges.length,
      badgeData: badges.map((badge) => { return { badge_name: badge.badge_name, stars: badge.stars } }),
    });
  })),

  codechef: (['/codechef', '/codechef/:username'], controllerBoilerPlate(async (req) => {
    let username = req.params.username;
    if (username === "" || !username) {
      username = req.user.socials.codechef;
    }
    const data = (await getSocialData("codechef", username));
    if (data.status === 404 || data.data?.result === undefined)
      throw new ControllerError(404, 'User not found!');
    const codechefData = data.data.result?.data?.content;
    if (!codechefData?.ratings || !codechefData.rankings)
      throw new ServiceError(502, 'Codechef data unavailable.');
    codechefData.ratings = codechefData.ratings.allContest;
    // Calculating div on the basis of ratings
    if (codechefData.ratings < 1400) codechefData.div = 4
    else if (codechefData.ratings >= 1400 && codechefData.ratings < 1600) codechefData.div = 3
    else if (codechefData.ratings >= 1600 && codechefData.ratings < 2000) codechefData.div = 2
    else if (codechefData.ratings >= 2000) codechefData.div = 1
    return controllerResponse(201, 'Successful', {
      codechefUsername: codechefData.username,
      rankings: codechefData.rankings.allContestRanking,
      ratings: codechefData.ratings,
      language: codechefData.language || "None",
      band: codechefData.band,
      submissionStats: codechefData.submissionStats,
      div: codechefData.div
    });
  })),
}
