var GitHubApi = require('github');
var request = require('request');
var chalk = require('chalk');
var yaml = require('js-yaml');
var fs = require('fs');
var moment = require('moment');
var _ = require('lodash');
var Promise = require("bluebird");
var handlebars = require("handlebars");
var util = require('util');

var milestones = require("./milestones");
var source = fs.readFileSync('./templates/content.html', 'utf8');
var template = handlebars.compile(source);
var config;
try {
  var config = yaml.safeLoad(fs.readFileSync('.config.yml', 'utf8'));
} catch (e) {
  console.log(e);
}

var projects = config.atlassian.projects.join("|")
var regexr = new RegExp("((" + projects + ")-[0-9+]\\w+)", 'gi');

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


var Confluence = require("confluence-api");
var confluenceConfig = {
  username: config.atlassian.username,
  password: config.atlassian.password,
  baseUrl: config.atlassian.confluenceUrl
};
var confluence = new Confluence(confluenceConfig);


var transformIssuesForHandlebars = function(issues, repoName) {
  // for each date
  var allIssuesByDate = _.reduce(issues, function(accul, issueWithDate) {
    var results = issueWithDate.title.match(regexr);
    var formattedDate = moment(issueWithDate.date, "MM-DD-YYYY").format("dddd");
    _.each(results, function(result) {
      accul.push({
        date: formattedDate,
        id: result
      });
    })
    return accul;
  }, []);
  return {
    repo: repoName,
    issues: allIssuesByDate
  }
}

var reposWithActiveMilestones = [];
milestones.getReposWithActiveMilestones(github, config.repos)
  .then(function(milestoneResults) {
    //for each repo and each milestone thats relevant that week we need to get all issues
    //and then organize them into readable format
    return milestones.getFormattedIssuesByRepoAndMilestone(github, milestoneResults);
  })
  .then(function(issuesByRepo) {
    var formattedDisplay = _.map(issuesByRepo, function(issues, repoName) {

      var data = transformIssuesForHandlebars(issues, repoName);
      // return data;
      return template(data);

    });
    var formattedDisplayString = formattedDisplay.join("");

    confluence.postContent(config.atlassian.spaceKey, moment().format("MMDDYYYY") + " Deployment Notes - DRAFT", formattedDisplayString, null, function(err, data) {
      if (err) {
        console.log(err)
        return;
      }
      console.log(chalk.bgGreen('Successfully posted to Confluence'));
    });
  });

