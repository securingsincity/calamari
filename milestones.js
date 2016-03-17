var Promise = require("bluebird");
var _ = require("lodash");


var getReposWithActiveMilestones = function(github, repos) {

  var getAllMilestonesFn = Promise.promisify(github.issues.getAllMilestones);

  return Promise.reduce(repos, function(total, repo) {
    return getAllMilestonesFn({
      user: repo.username,
      repo: repo.repo,
      state: 'open'
    }).then(function(milestones) {


      var milestoneResult = _.reduce(milestones, function(result, milestone) {
        if (milestone.open_issues > 0) {
          result.username = repo.username;
          result.repo = repo.repo;
          if (_.isEmpty(result['milestones'])) {
            result.milestones = [];
          }
          result.milestones.push({
            title: milestone.title,
            id: milestone.id,
            number: milestone.number
          })
        }

        return result;
      }, {});
      if (!_.isEmpty(milestoneResult)) {
        total.push(milestoneResult)
      }
      return total;
    }).error(function(err) {
      console.log(err);
      return total;
    });
  }, [])
}

var getIssuesByMilestone = function getIssuesByMilestone(github, user, repo, milestone) {
  var getAllIssuesByMilestoneFn = Promise.promisify(github.issues.repoIssues);
  return getAllIssuesByMilestoneFn({
    user: user,
    repo: repo,
    milestone: milestone.number
  });
}

var getFormattedIssuesByRepo = function getFormattedIssuesByRepo(github, user, repo, milestones) {
  return Promise.reduce(milestones, function(total, milestone) {
    return getIssuesByMilestone(github, user, repo, milestone).then(function(issues) {
      _.each(issues, function(issue, el) {
        total.push({
          date: milestone.title,
          title: issue.title
        })
      });
      return total
    });
  }, []);
}

var getFormattedIssuesByRepoAndMilestone = function(github, reposWithMilestones) {
  return Promise.reduce(reposWithMilestones, function(total, repoWithMilestone) {
    return getFormattedIssuesByRepo(github, repoWithMilestone.username, repoWithMilestone.repo, repoWithMilestone.milestones)
      .then(function(results) {

        total[repoWithMilestone.repo] = results;
        return total
      })
  }, {});
}


module.exports = {
  getFormattedIssuesByRepoAndMilestone: getFormattedIssuesByRepoAndMilestone,
  getFormattedIssuesByRepo: getFormattedIssuesByRepo,
  getIssuesByMilestone: getIssuesByMilestone,
  getReposWithActiveMilestones: getReposWithActiveMilestones,
}