var Promise = require("bluebird");
exports.getReposWithActiveMilestones = function(github, repos) {

  var getAllMilestonesFn = Promise.promisify(github.issues.getAllMilestones);

  return Promise.reduce(repos, function(total, repo) {
    return getAllMilestonesFn({
      user: repo.username,
      repo: repo.repo,
      state: 'open'
    }).then(function(results) {
      if (results && results.length) {
        for (var i = 0; i < results.length; i++) {
          if (results[i].open_issues > 0) {
            total.push(repo);
            break;
          }
        }
      }
      return total;
    })
      .error(function() {
        return total;
      });
  }, [])
}