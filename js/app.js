

/*
# TODO
- day.availableFunds should be computed from starterFunds + earning


# ACCOUNTING
- init: ApplicationRoute.setupController
    - update vault 

- invest in a goal: GoalsRoute.actions.invest
    - reduce vault availableFunds
    - inc vault totalInvestments
    - if current day 
      - reduce current day availableFunds
      - inc current day totalInvestments
      - create dailyGoal record

- check in: ApplicationRoute.actions.dailyCheckIn
    - load vault availableFunds and totalInvestment
    - for any missing days, for each invested goal, create dailyGoal
    - calc availableFunds
    - update vault availableFunds
    - copy availableFunds to day
    - copy totalInvestment to day

- action: DaysRoute.actions.saveActivity
    - inc vault availableFunds
    - inc current day availableFunds
    - inc dailyGoal earnings

- completed a goal: GoalsRoute.actions.update
    - inc vault availableFunds
    - reduce vault totalInvestments
    - if current day
      - inc current day availableFunds
      - reduce current day totalInvestments
      - remove next action
*/

App = Ember.Application.create({
  // LOG_MODULE_RESOLVER: true,

  // LOG_ACTIVE_GENERATION: true,

  // Basic logging, e.g. "Transitioned into 'post'"
  LOG_TRANSITIONS: true, 

  // // Extremely detailed logging, highlighting every internal
  // // step made while transitioning into a route, including
  // // `beforeModel`, `model`, and `afterModel` hooks, and
  // // information about redirects and aborted transitions
  // LOG_TRANSITIONS_INTERNAL: true,

  //LOG_VIEW_LOOKUPS: true,
  //LOG_BINDINGS: true,

});


App.ApplicationAdapter = DropboxDataStoreAdapter("3pjra0nxwgejhqm", App);

/*
// Prevent accidental leaving the page
window.onbeforeunload = function() {
  return "Are you sure you want to navigate away?";
}
*/


/* ***************************************************
 *
 * Routes 
 *
 */

App.Router.map(function() {
  this.resource('days', {path: '/days'});
  this.resource('goals', {path: '/goals'});  
});
App.IndexRoute = Ember.Route.extend({
  redirect: function() {
    this.transitionTo('days');
  }
});


App.ApplicationRoute = Ember.Route.extend({

  beforeModel: function() {
    // return clearTable(this.get('store'), 'activity');    
    // clearTable(this.get('store'), 'dailyGoal');
    // clearTable(this.get('store'), 'goal');
    // return clearTable(this.get('store'), 'vault');  
  },
  // model: function() {
  //   return this.get('store').find('day').then(
  //     function(result) {
  //       var days = result.get('content');
  //       // Connect days with their daily goals and notes
  //       for (var i = 0; i < days.length; i++) {
  //         if (days[i].get('date') >= '2014-04-10') {
  //           deleteDay(days[i]);
  //           // days[i].set('starterFunds', 200);
  //           // days[i].set('expenses', 0);
  //           // days[i].set('totalInvestments', 0);
  //           // days[i].save();      
  //         }
  //       }
  //     }
  //   );    
  // },

  afterModel: function() {
    var self = this;
    var store = self.get('store');
    var controller = self.controllerFor('application');

    return store.findAll('vault').then(
      function(result) {
        var vaults = result.get('content');
        var lastCheckInDate;


        // Load preset records into controller, create them if first time
        if (vaults.length === 0) {
          lastCheckInDate = todayDate();          
          // lastCheckInDate = '2014-04-10'; // TEMP
          // Create new day 
          createDay(store, lastCheckInDate, GAME_STARTER_FUND, 0, true);
          // Create new vault
          var lastDayVault = newVault(store, VAULT_TYPE_DAY, VAULT_LAST_CHECK_IN_DATE, lastCheckInDate);
          controller.set('lastCheckInDateVault', lastDayVault);  

        } else {
          for (var i = 0; i < vaults.length; i++) {
            var type = vaults[i].get('type');
            var key = vaults[i].get('key');
            var value = vaults[i].get('value');

            if (type === VAULT_TYPE_DAY && key === VAULT_LAST_CHECK_IN_DATE) {  
              controller.set('lastCheckInDateVault', vaults[i]);
              lastCheckInDate = value;
            }
          } // for
        }
      }
    );
  },
  // TEMP: clean up
  setupController: function(controller, model) {

    var self = this;
    var store = self.get('store');

    var lastCheckInDate = controller.get('lastCheckInDateVault').get('value');
    return store.find('day', {date: lastCheckInDate}).then(
      function(result) {
        var day = result.get('content')[0];
        if (day) {
          controller.set('lastCheckInDay', day);
        }
      }
    );
  },

  actions: {
    dailyCheckIn: function() {
      console.log('>> ApplicationRoute dailyCheckIn');
      dailyCheckIn(this.get('controller')); 
    },
  }  
});


App.DaysRoute = Ember.Route.extend({
  // beforeModel: function() {
  //   console.log('>> DaysRoute beforeModel');
  // },  
  // model: function() {
  //   console.log('>> DaysRoute model');
  // },
  // afterModel: function() {
  //   console.log('>> DaysRoute afterModel');      
  // },

  setupController: function(controller, model) {
    console.log('>> ApplicationRoute setupController');

    var store = this.get('store');
    var self = this;    
    var p0 = store.findAll('day');
    var p1 = store.findAll('activity');
    var p2 = store.findAll('note');
    var p3 = store.findAll('dailyGoal');

    return Ember.RSVP.all([p0, p1, p2, p3]).then(function(array) {
      var days = array[0].get('content');
      var activities = array[1].get('content');
      var notes = array[2].get('content');   
      var dailyGoals = array[3].get('content');      

      // Connect days with their daily goals and notes
      for (var i = 0; i < days.length; i++) {

        // Connect notes
        for (var j = 0; j < notes.length; j++) {
          if (notes[j].get('day').get('id') === days[i].get('id')) {
            days[i].get('notes').addObject(notes[j]);
          }
        } 

        // Connect daily goals
        for (var j = 0; j < dailyGoals.length; j++) {
          if (dailyGoals[j].get('day').get('id') === days[i].get('id')) {
            days[i].get('dailyGoals').addObject(dailyGoals[j]);
            // Connect activities
            connectActivitiesAndSetupTheNextActivity(store, dailyGoals[j], activities);
          }
        }
      } // for days  

      controller.set('content', days); 
    });

  },  

  actions: {
    //
    // Day record
    //
    update: function(day) {
      console.log('>> update', day);    
      this.controllerFor("application").set('isEditing', false);

      var self = this;
      day.save(); 
    },

    //
    // Action activity
    //
    saveActivity: function(activity) {
      console.log('>> DaysRoute saveActivity', activity);  
      saveActivity(this, activity);   
    },

    //
    // Note
    //
    newNote: function(day) {
      creatingNote(this.get('store'), day);
    },
    updateNote: function(note) {
      console.log('>> DaysRoute updateNote', note);
      // Abandoned new notes?
      if (note.get('isNew')) {
        // If blank, delete it
        if (!note.get('body').trim()) {
          note.deleteRecord();
          return;
        }         
      }      
      // Update storage
      note.set('editedAt', now());
      note.save();  
    },
  }  
});

App.GoalsRoute = Ember.Route.extend({
  model: function() {
    return this.get('store').find('goal');
  },

  actions: {
    adding: function() {
      var store = this.get('store');
      creatingGoal(store);

      this.toggleProperty('isNew');      
    },

    update: function(goal) {
      if (goal.get('isNew')) {
        this.controller.set('isNew', false)
        // If blank, delete it
        if (!goal.get('title').trim()) {
          goal.deleteRecord();
          return;
        }         
      }

      var store = this.get('store');      
      updateGoal(store, goal);
    },  

    invest: function(goal) {
      investGoal(this, goal);
    },

  }
});



/* ***************************************************
 *
 * Components 
 *
 */

App.GoalRecordComponent = Ember.Component.extend({
  init: function() {
    this._super();
    this.set('isEditing', this.get('goal').get('isNew'));
    this.set('isChanging', this.get('isEditing'));    
  },
  actions: {
    editing: function() {
      this.toggleProperty('isEditing');
      this.toggleProperty('isChanging');       
    },    
    update: function(goal) {
      this.toggleProperty('isEditing');      
      this.toggleProperty('isChanging');

      this.sendAction('updateAction', goal); 
    },   

    investing: function() {
      this.toggleProperty('isInvesting');             
      this.toggleProperty('isChanging');       
    },
    invest: function(goal) {
      this.toggleProperty('isInvesting');      
      this.toggleProperty('isChanging');

      // Make sure we don't use string 
      var investment = parseInt(goal.get('investment'), 10);
      goal.set('investment', investment);

      this.sendAction('investAction', goal); 
    }, 
  }
});

App.DayRecordComponent = Ember.Component.extend({
  init: function() {
    this._super();
    this.set('isEditing', this.get('record').get('isNew'));
  },
  earningsStyle: function() {
    return currencyButtonCssClass(this.get('record').get('earnings'));
  }.property('earnings'),
  availableFundsStyle: function() {
    return currencyButtonCssClass(this.get('record').get('availableFunds'));
  }.property('availableFunds'),
  expensesStyle: function() {
    return currencyButtonCssClass(this.get('record').get('expenses'));
  }.property('expenses'),

  actions: {

    update: function() {
      var r = this.get('record');
      this.sendAction('updateAction', r);

      this.toggleProperty('isEditing'); 
    },
    cancel: function() {
      var r = this.get('record');
      this.sendAction('cancelAction', r);     

      this.toggleProperty('isEditing');  
    },   
    delete: function() { 
      var r = this.get('record');
      console.log('>> DayRecordComponent delete', r.get('date'));
      this.sendAction('deleteAction', r);  

      this.toggleProperty('isEditing');    
    },

    //
    // Action activity
    //
    newActivityAction: function(action) {
      this.sendAction('newActivityAction', action);        
    },

    updateGoalAction: function(goal) {
      this.sendAction('updateGoalAction', goal);
    },

    //
    // Note
    //
    addingNote: function(day) {
      this.sendAction('newNoteAction', day); 

      this.toggleProperty('isNewNote');
    },
    updateNoteAction: function(note) {
      this.sendAction('updateNoteAction', note);

      if (this.get('isNewNote')) {
        this.toggleProperty('isNewNote');        
      }
    },    
  }
});

App.DailyGoalComponent = Ember.Component.extend({
  actions: {
    addingActivity: function(activity) {
      // ???
      // // If action is scheduled, save it for editing
      // if (!action) {
      //   var dailyGoal = this.get('dailyGoal');
      //   action = {
      //     goal: dailyGoal.get('goal'),
      //     day: dailyGoal.get('day'), 
      //     body: '',
      //     createdAt: '',
      //     actionAt: ''           
      //   }
      // } 
      this.set('clockStarts', new Date());
      this.set('newActivity', activity);

      this.toggleProperty('isAddingActivity');
    }, 

    addActivity: function(newActivity) {
      this.toggleProperty('isAddingActivity');

      var duration = moment().diff(this.get('clockStarts'), 'minutes');
      var clockStarts = this.get('clockStarts');

      // Ember Data
      if (!newActivity.get('body').trim()){
        if (duration < 1)  {
          newActivity.set('body', 'check-in');
        } else {
          newActivity.set('body', moment().from(clockStarts, true));
        }
      }
      // // Smuggle dailyGoal for later use
      // newActivity.set('dailyGoal', this.get('dailyGoal'))           
      this.sendAction('newActivityAction', newActivity); 
    },     
  }
});

App.DailyNoteComponent = Ember.Component.extend({
  init: function() {
    this._super();
    this.set('isEditing', this.get('note').get('isNew'));
  },  
  actions: {
    editing: function() {
      this.toggleProperty('isEditing');   
    }, 

    update: function(note) {
      this.sendAction('updateNoteAction', note);
      this.toggleProperty('isEditing');       
    },

    confirmingCancel: function() {
      this.toggleProperty('isConfirmingCancel'); 
    },
    confirmedCancel: function(note) {    
      if (note.get('isNew')) {
        // Going to delete this newly created record
        note.set('body', '');
        this.sendAction('updateNoteAction', note);
      } else if (note.get('isDirty')) {
        note.rollback();
      }
      this.toggleProperty('isConfirmingCancel'); 
      this.toggleProperty('isEditing');            
    },  
    nevermind: function() {
      this.toggleProperty('isConfirmingCancel');       
    },    
  }
});



///////////////////////////////////////////////////////
//
// Helpers
//

var clearTable = function(store, tableName) {
  return store.find(tableName).then(
    function(result) {
      var array = result.get('content');
      for (var i = array.length - 1; i >= 0; i--) {
        array[i].deleteRecord();
        array[i].save();
      }
    }
  );  
}

var newVault = function(store, type, key, value) {
  var obj = {
    type: type,
    key: key,
    value: value,
    editedAt: now()
  }
  var item = store.createRecord('vault', obj);
  item.save();
  return item;
};

var updateVault = function(item, value) {
  item.set('value', value);
  item.save(); 
}

///////////////////////////////////////////////////////
//
// Day
//

/* dailyCheckIn
 * Referenced: ApplicationRoute.dailyCheckIn
 */
var dailyCheckIn = function(controller) {
  console.log('>> dailyCheckIn');  

  var lastCheckInDay = controller.get('lastCheckInDay');
  var lastCheckInDateVault  = controller.get('lastCheckInDateVault');

  if (lastCheckInDateVault.get('value') === todayDate()) return;

  var availableFunds = lastCheckInDay.get('availableFunds');
  var totalInvestments = lastCheckInDay.get('totalInvestments');

  // Create all the days between the last check-in and today
  lastCheckInDay = createNextDayFromDay(
    lastCheckInDay, 
    controller.get('store'), 
    lastCheckInDateVault,
    availableFunds,
    totalInvestments);
  controller.set('lastCheckInDay', lastCheckInDay);
};

// Create day from a previous day
var createNextDayFromDay = function(day, store, lastCheckInDateVault, availableFunds, totalInvestments) {
  console.log('>> createNextDayFromDay', day.get('date')); 
  // Next day's date   
  var newDate = nextDayDateFromDate(day.get('date'));
  var isCheckingIn = newDate === todayDate();
  var newDay = createDay(store, newDate, availableFunds, totalInvestments, isCheckingIn);

  if (newDate >= todayDate()) {
    updateVault(lastCheckInDateVault, newDate);
    return newDate;

  } else {
    // Avoid using day.earnings as it relies on dailyGoals which are being created async
    availableFunds += totalInvestments * GAME_GOAL_DAILY_PENALTY;
    return createNextDayFromDay(newDay, store, lastCheckInDateVault, availableFunds, totalInvestments)
  }
};

// Referenced: ApplicationRoute.setupController,  ApplicationRoute.dailyCheckIn
var createDay = function(store, date, availableFunds, totalInvestments, isCheckingIn) {
  console.log('>> createDay');   
  var obj = {
    date: date,
    starterFunds: availableFunds,
    expenses: 0,
    totalInvestments: totalInvestments,
    checkedIn: isCheckingIn
  };
  var day = store.createRecord('day', obj); 
  day.save().then(
    function (result) {
      // Add daily goals, regardless isCheckingIn or not because they effect the daily earnings     
      store.find('goal').then(
        function(result) {
          var goals = result.get('content');
          createDailyGoals(store, day, goals);          
        }
      );                     
    }      
  );
  return day;
};

var deleteDay = function(day) {
  // Delete daily goals
  deleteDailyGoals(day);
  // Delete day record
  day.deleteRecord();
  day.save();
};
var deleteDailyGoals = function(day) {
  // NOTE: Count backwards when removing items from an array   
  var dailyGoals = day.get('dailyGoals').get('content');  
  for (var i = dailyGoals.length - 1; i >= 0; i--) {
    // Delete activities    
    var activities = dailyGoals[i].get('activities').get('content');
    for (var j = activities.length - 1; j >= 0; j--) {
      activities[j].deleteRecord();
      activities[j].save();
    }
    // Delete daily goals
    dailyGoals[i].deleteRecord();
    dailyGoals[i].save();
  }    
};

///////////////////////////////////////////////////////
//
// Goal
//

// Create a goal but don't save it yet
var creatingGoal = function(store) {
  var obj = {
    title: '',
    body: '',
    daily: true,
    startDate: DATE_FUTURE,
    endDate: DATE_FUTURE,
    investment: 0
  };
  var goal = store.createRecord('goal', obj);
};

var updateGoal = function(store, goal) {
  // Completing the goal
  if (goal.get('isCompleted')){
    // NOTE: technique for figuring out what was changed
    var changes = goal.changedAttributes(); //=> { isCompleted: [oldValue, newValue] }
    if (changes.get('isCompleted')) {
      goal.set('endDate', todayDate());
      // TODO: accounting and stop dailygoal   
    }
  } 

  goal.save();  
};

// Start a goal investment
// Assume today is checked in
var investGoal = function(route, goal) {
  var controller = route.controllerFor('application');


  // var fundVault = controller.get('availableFundsVault');
  // var investmentVault = controller.get('totalInvestmentsVault');
  // var lastCheckInDate = controller.get('lastCheckInDateVault').get('value');
  var lastCheckInDay = controller.get('lastCheckInDay');

  var expenses = lastCheckInDay.get('expenses');
  var totalInvestments = lastCheckInDay.get('totalInvestments');
  var availableFunds = lastCheckInDay.get('availableFunds');
  var pendingInvestment = goal.get('investment');
  if (availableFunds < pendingInvestment) return; // Not enough funds

  lastCheckInDay.set('expenses', expenses + pendingInvestment);
  lastCheckInDay.set('totalInvestments', totalInvestments + pendingInvestment);
  lastCheckInDay.save();

  // Create daily goal
  createDailyGoal(route.get('store'), lastCheckInDay, goal);   

  // Update goal record 
  goal.set('startDate', lastCheckInDay.get('date'));
  goal.save();  
};

///////////////////////////////////////////////////////
//
// Daily goal
//

// Ref: dailyCheckIn > ... > createDay
var createDailyGoals = function(store, day, goals) {
  console.log('>> createDailyGoals');     
  // Loop through all goal records
  for (var i = 0; i < goals.length; i++) {
    var goalStartDate = goals[i].get('startDate');
    var goalEndDate = goals[i].get('endDate');
    var date = day.get('date');

    // If the goal range covers today
    if (goalStartDate <= date && date <= goalEndDate) {
      // Create daily goal
      createDailyGoal(store, day, goals[i]);
    }        
  } 
};

// Ref: investGoal, dailyCheckIn > ... > createDay > createDailyGoals
var createDailyGoal = function(store, day, goal) {
  console.log('>> createDailyGoal');    
  var obj = {
    goal: goal,
    day: day,
    investment: parseInt(goal.get('investment'), 10),
  }
  var dailyGoal = store.createRecord('dailyGoal', obj);
  dailyGoal.save();
  day.get('dailyGoals').addObject(dailyGoal);

  // Setup the next action
  creatingNextActivity(store, dailyGoal, now());
};


//
// Action activity
//

var connectActivitiesAndSetupTheNextActivity = function(store, dailyGoal, activities) {
  // Set actions to their daily goals  
  var lastActionTime = DATE_NEVER;
  var hasNextActivity = false;
  for (var k = 0; k < activities.length; k++) {
    if (activities[k].get('dailyGoal').get('id') === dailyGoal.get('id')) {
      dailyGoal.get('activities').addObject(activities[k]);
      // Find the last activity
      if (activities[k].get('createdAt') > lastActionTime) {
        lastActionTime = activities[k].get('createdAt');
      }
      // Scheduled activity is in memory even after navigating to another route
      if (activities[k].get('isNew')) {
        hasNextActivity = true;
      }
    }
  }  

  if (!hasNextActivity) {
    // Only invested goals can have actions today
    if (dailyGoal.get('day').get('isToday') && dailyGoal.get('isActive')) {
      // Setup the next action
      var actionAt = lastActionTime === DATE_NEVER ? 
        now() : moment(lastActionTime).add('hours', ACTION_INTERVAL_IN_HOURS).format();    
      creatingNextActivity(store, dailyGoal, actionAt);
    }      
  }
};

// Ref: connectActivitiesAndSetupTheNextActivity, saveActivity
var creatingNextActivity = function(store, dailyGoal, actionAt) {
  var obj = {
    dailyGoal: dailyGoal,
    body: '',
    reward: 0,
    actionAt: actionAt,
    createdAt: ''    
  }
  var activity = store.createRecord('activity', obj);  
  dailyGoal.get('activities').addObject(activity);

  return activity;   
};

var saveActivity = function(route, activity) {
  var store = route.get('store'); 
  var dailyGoal = activity.get('dailyGoal');

  // Finance
  //
  var investment = parseInt(dailyGoal.get('investment'), 10);
  var previousRewards = 0, reward = 0;

  // Calculate previous rewards
  var activities = dailyGoal.get('activities').get('content');
  for (var i = 0; i < activities.length; i++) {
    // Skip the current new activity
    if (activities[i].get('isNew')) continue;
    previousRewards += activities[i].get('reward');  
  }
  // Reward on current activity
  var reward = investment * (previousRewards === 0? GAME_GOAL_1ST_ACTION_REWARD : GAME_GOAL_ACTION_REWARD);
  
  // If not exceeding daily max, add to available funds
  if (reward + previousRewards <= investment * GAME_GOAL_MAX_ACTION_REWARD) {
    // Record the gain
    activity.set('reward', reward);    
  } 

  activity.set('createdAt', now());  
  activity.save().then(
    function (answer) {
      var actionAt = moment().add('hours', ACTION_INTERVAL_IN_HOURS).format();
      creatingNextActivity(store, dailyGoal, actionAt);
    }        
  );  
}


//
// Note
//

var creatingNote = function(store, day) {
  var obj = {
    day: day,
    tag: '',
    body: '',
    editedAt: now()
  }
  var note = store.createRecord('note', obj);
  day.get('notes').addObject(note);
  return note;
};

// var createTag = function(store, note, tagString) {
//   var tag = note.get(tags).get('content')[0];
//   if (tag) {  
//   } else {
//     // The note has no tag
//     store.find('tag', {tag: tagString}).then(
//       function(result) {
//         var tags = result.get('content');
//         if (tags.length === 0) {
//           tag = store.createRecord('tag', {tag: tagString});
//           tag.save().then(
//             function(result) {
//               createNoteTag(store, note, tag);
//             }
//           );
//         } else {
//           tag = tags[0];
//           createNoteTag(store, note, tag);
//         }
//           note.get('tags').addObject(tag);
//           tag.get('notes').addObject(note);        
//       }
//     );    
//   }
// };
// var createNoteTag = function(store, note, tag) {
//   var obj = {
//     note: note,
//     tag: tag
//   };
//   var noteTag = store.createRecord('noteTag', obj);
//   noteTag.save();
// }



var todayDate = function() {
  return moment(new Date()).format('YYYY-MM-DD');
};

var now = function() {
  return moment().format();
};

var nextDayDateFromDate = function(date) {
  return moment(date).add('days', 1).format('YYYY-MM-DD');
};

var vaultToInteger = function(vault) {
  return parseInt(vault.get('value'), 10);
};
//
// Template Format Helpers
//

var showdown = new Showdown.converter();
Ember.Handlebars.helper('format-markdown', function(input) {
  return new Handlebars.SafeString(showdown.makeHtml(input));
});

Ember.Handlebars.registerBoundHelper('format-hour', function(date) {
  var duration = moment().diff(date, 'minutes');  
  // Past event  
  if (duration > 0) {
    return moment(date).format('h a');
  // In less than 30 minutes
  } else if (duration > -30) {
    return 'Now';
  // In the future
  } else {
    return moment(date).format('h a');    
  }
});

var currencyButtonCssClass = function(currency) {
  var style = '';
  if (currency > 0) {
    style = 'btn btn-lg btn-success disabled';
  } else if (currency === 0) {
    style = 'btn btn-lg btn-default disabled';
  } else {
    style = 'btn btn-lg btn-danger disabled';    
  }
  return style;  
};



