var GitHubApi = require('github');
var request = require('request');
var yaml = require('js-yaml');
var fs = require('fs');
var Promise = require("bluebird");
var milestones = require("./milestones");
var config;
try {
  var config = yaml.safeLoad(fs.readFileSync('.config.yml', 'utf8'));
} catch (e) {
  console.log(e);
}
process.env.NODE_ENV = 'production';
// //connect to github
var github = new GitHubApi({
  // required
  version: "3.0.0",
  // optional
  debug: false,
  protocol: "https",
  host: config.github.host, // should be api.github.com for GitHub
  pathPrefix: config.github.pathPrefix, // for some GHEs; none for GitHub
  timeout: 5000
});

github.authenticate({
  type: "oauth",
  token: config.github.access_token
});

var reposWithActiveMilestones = [];
milestones.getReposWithActiveMilestones(github, config.repos)
  .then(function(results) {
    console.log(results);
  })

