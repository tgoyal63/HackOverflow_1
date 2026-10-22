const platformState = {
  graph: undefined,
  stats: undefined,
  mul: undefined,
  contributions: undefined,
  githubUsername: undefined,
  public_repos: undefined,
  public_gists: undefined,
  followers: undefined,
  following: undefined,
  organizations: undefined,
  github_created_at: undefined,
  hackerrankUsername: undefined,
  hackerrank_created_at: undefined,
  level: undefined,
  followers_count: undefined,
  totalSubmissions: undefined,
  totalBadges: undefined,
  badgeData: undefined,
  codechefUsername: undefined,
  ratings: undefined,
  language: undefined,
  band: undefined,
  div: undefined,
  global: undefined,
  country: undefined,
  submissionStats: undefined,
}

const initialState = {
  ...platformState,
  token: null,
  loginUsername: null,
  isGithubError: false,
  isError: false,
  isAdd: false,
  isRemoved: false,
  isRemove: false,
  isLogout: true,
  isLogin: false,
  isRegister: false,
  isUpVote: false,
  isDownVote: false,
}

const readInitialState = () => ({
  ...initialState,
  token: localStorage.getItem("token"),
  loginUsername: localStorage.getItem("loginUsername"),
})

export { initialState, platformState, readInitialState }
