angular.module('app.leagues.show', [])
.controller('showLeagueController', function ($scope, $stateParams, ShowLeague, $location, $window, $state) {
  $scope.league = {};
  $scope.events = [];
  $scope.characters = [];
  $scope.showEvents = false;
  $scope.showCharacters = false;
  $scope.indexUser;
  $scope.indexSelect;
  $scope.showTool = false;
  $scope.showUserRoster = true;
  $scope.charEventTrigger = {};

  ///////////////////////////////////////
  var socket = io.connect();
  socket.on('success', function(data) {
    alert(data);
    socket.emit('joinLeague', {leagueId: $stateParams.id});
  });

  socket.on('triggerEvent', function(data) {
    console.log(data);
    //find value of event
    for (var i = 0; i < $scope.events.length; i++) {
      if ($scope.events[i].id === data.eventId) {
        data.score_up = $scope.events[i].score_up;
      }
    }
    console.log(data);
    console.log("user rosters: ", $scope.userRosters);
    //loop through user rosters and increase total score as well as score for specific character
    for (var user in $scope.userRosters) {
      var userHasCharacter;
      for (var i = 0; i < $scope.userRosters[user].length; i++ ) {
        if ($scope.userRosters[user][i].league_character_id === data.characterId) {
          $scope.userRosters[user][i].current_score += data.score_up;
          userHasCharacter = true;
        }
      }
      if (userHasCharacter) {
        $scope.userRosters[user].totalScore += data.score_up;
      }
      userHasCharacters = false;
    }
    $scope.$apply();
  })
  //////////////////////////////////////

  $scope.returnUserRoster = ShowLeague.returnUserRoster;

  $scope.setCharacter = function(characterId) {
    $scope.charEventTrigger.characterId = characterId;
    console.log($scope.charSelection);
    console.log(this);
  }

  $scope.setEvent = function(eventId) {
    $scope.charEventTrigger.eventId = eventId;
    console.log($scope.eventSelection);
  }

  var currentUserId = JSON.parse(localStorage.getItem('user')).id;

  $scope.isOwner = function() {
    if(currentUserId === $scope.league.owner) {
      return true;
    }
    return false;
  };

  $scope.triggerEvent = function() {
    ShowLeague.triggerEvent($scope.charEventTrigger, function(triggeredEvent) {
      var triggeredEventEmit = {
        leagueId: triggeredEvent.league_id,
        characterId: triggeredEvent.league_character_id,
        eventId: triggeredEvent.league_event_id
      }
      socket.emit('triggerEvent', triggeredEventEmit);
    });
  }

  $scope.toggleTool = function() {
    $scope.showTool = !$scope.showTool;
  };

  $scope.toggleEvents = function() {
    $scope.showEvents = !$scope.showEvents;
  };

  $scope.toggleCharacters = function() {
    $scope.showCharacters = !$scope.showCharacters;
  };

  $scope.showRoster = function(index, userId) {
    //if that roster is already being displayed, close it
    if ($scope.indexSelect === index) {
      $scope.indexSelect = null;
    }
    else {
      //display roster of the user that was clicked
      $scope.indexSelect = index;
    }
  }

  $scope.getLeague = function (){
    ShowLeague.getLeague($stateParams.id, function (err, response) {
      if (!err) {
        $scope.league = response;
        
        //get all users, then make independet http calls for each of their rosters
        ShowLeague.getUsers($scope.league.id, function (err, getUsersResponse){
          $scope.users = getUsersResponse;
          $scope.userRosters = {};
          for (var i = 0; i < $scope.users.length; i++) {
            //wrapper creates closure over currentUserIndex, required due to nature of asynch call
            var getUserWrapper = function () {
              var currentUserIndex = i;
              ShowLeague.getUserRoster($scope.league.id, $scope.users[i].id, function(err, getRosterResponse) {
                $scope.userRosters[$scope.users[currentUserIndex].id] = getRosterResponse;
                //gets current users roster size - used to determine if the draft button should be displayed
                if($scope.users[currentUserIndex].id === currentUserId) {
                  $scope.rosterLength = getRosterResponse.length;
                }
              });
            }
            //immediately invoke wrapper function
            getUserWrapper();
          }
        });

      }
      else {
        console.log(err)
      }
    });
  } ;

  $scope.selectUser = function (index) {
    $scope.indexUser = index;
  };

  $scope.getEvents = function() {
    ShowLeague.getEvents($stateParams.id).success(function(data) {
      $scope.events = data;
    }).error(function(err) {
      console.log(err);
    });
  };

  $scope.getCharacters = function() {
    ShowLeague.getCharacters($stateParams.id).success(function(data) {
      $scope.characters = data;
    }).error(function(err) {
      console.log(err);
    });
  };

  $scope.getLeague();
  $scope.getEvents();
  $scope.getCharacters();
})

.factory('ShowLeague', function ($http, $stateParams) {

  var triggeredEvents = [];
  var userRosters = {};

  var getLeague = function(id, callback) {
    $http({
      method: 'GET',
      url: '/league/' + id,
    })
    .success(function (res) {
      callback(false, res);
    })
    .error(function (err) {
      callback(true, err);
    });
  };

  var getUsers = function(id, callback) {
    $http({
      method: 'GET',
      url: '/league/' + id + '/users',
    })
    .success(function (res) {
      callback(false, res);
    })
    .error(function (err) {
      callback(true, err);
    });
  };

  var getEvents = function(league_id) {
    return $http({
      method: 'GET',
      url: '/league/' + league_id + '/events'
    }).success(function(resp) {
      return resp;
    }).error(function(err) {
      return err;
    });
  }

  var getCharacters = function(league_id) {
    return $http({
      method: 'GET',
      url: '/league/' + league_id + '/characters'
    }).success(function(resp) {
      return resp;
    }).error(function(err) {
      return err;
    });
  }

  var getUserRoster = function(leagueId, userId, callback) {
    $http({
      method: 'GET',
      url: '/league/' + leagueId + '/user/' + userId + '/roster',
    })
    .success(function (res) {
      userRosters[userId] = {
        roster: res
      }

      //calculates users total score from individual characters in roster before passing response along
      res.totalScore = 0;
      for (var i = 0; i < res.length; i++) {
        res.totalScore += res[i].current_score;
      }

      callback(false, res);
    })
    .error(function (err) {
      callback(true, err);
    });
  };

  var triggerEvent = function(charEvent, callback) {
    // console.log(charEvent);
    alert(charEvent.eventId);
    $http({
      method: 'POST',
      url: '/league/' + $stateParams.id + '/triggerevent',
      data: charEvent
    })
      .success(function(triggeredEvent) {
        triggeredEvents.push(triggeredEvent);
        callback(triggeredEvent);
      })
      .error(function(err) {
        console.log("Error");
        callback(err);
      })
  };

  return {
    getLeague: getLeague,
    getUsers: getUsers,
    getEvents: getEvents,
    getCharacters: getCharacters,
    getUserRoster: getUserRoster,
    triggerEvent: triggerEvent
  };
});