$(document).ready(function () {
  $('[data-toggle=offcanvas]').click(function () {
    $('.row-offcanvas').toggleClass('active')
  });
});

App = Ember.Application.create({
  //LOG_ACTIVE_GENERATION: true,
  LOG_MODULE_RESOLVER: true,
  LOG_TRANSITIONS: true,
  //LOG_TRANSITIONS_INTERNAL: true, // Ember 1.3.0 [BUGFIX] Make flag LOG_TRANSITIONS_INTERNAL work again
  LOG_VIEW_LOOKUPS: true,
  /*
  LOG_ACTIVE_GENERATION: true,

  // Basic logging, e.g. "Transitioned into 'post'"
  LOG_TRANSITIONS: true, 

  // Extremely detailed logging, highlighting every internal
  // step made while transitioning into a route, including
  // `beforeModel`, `model`, and `afterModel` hooks, and
  // information about redirects and aborted transitions
  LOG_TRANSITIONS_INTERNAL: true,

  //LOG_VIEW_LOOKUPS: true,
  //LOG_BINDINGS: true,
  */
});


App.ApplicationAdapter = DropboxDataStoreAdapter("3pjra0nxwgejhqm", App);

/*
// Prevent accidental leaving the page
window.onbeforeunload = function() {
  return "Are you sure you want to navigate away?";
}
*/

var showdown = new Showdown.converter();
Ember.Handlebars.helper('format-markdown', function(input) {
  return new Handlebars.SafeString(showdown.makeHtml(input));
});

Ember.Handlebars.registerBoundHelper('format-hour', function(date) {
  return date ? moment(date).format('h a') : 'NOW';
});


var onFailed = function (reason, model) {
  console.log('>> updating ', model, '\n>> failed because', reason);
  model.rollback();
}

var currentDay = function() {
  return moment(new Date()).format('YYYY-MM-DD');
}
var forever = function() {
  return '2099-01-01';
}

/* ***************************************************
 *
 * Routes 
 *
 */

App.Router.map(function() {
  this.resource('days', {path: '/days'});
});
App.IndexRoute = Ember.Route.extend({
  redirect: function() {
    this.transitionTo('days');
  }
});
App.DaysRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    var store = this.get('store');
    var promise1 = store.findAll('day');
    var promise2 = store.findAll('goal');
    var promise3 = store.findAll('action');
    var self = this;

    Ember.RSVP.all([promise1, promise2, promise3]).then(function(array) {
      var days = array[0].get('content');
      var goals = array[1].get('content');
      var actions = array[2].get('content');
      var today;

      // // Clean up
      // for (var k = actions.length - 1; k >= 0; k--) {
      //   actions[k].deleteRecord();
      //   actions[k].save();
      // } // for actions       
      // for (var i = goals.length - 1; i >= 0; i--) {
      //   goals[i].deleteRecord();
      //   goals[i].save();
      // }

      // Loop through all day records
      for (var j = 0; j < days.length; j++) {
        if (days[j].get('isToday')) {
          today = days[j];
        }

        createDailyGoals(store, days[j], goals, actions);
      } // for days  

      // If today's record is not found, create it
      if (!today) {
        createToday(store, goals); 
      }

      // Must set content before setting other properties
      controller.set('content', days);
      controller.set('goals', goals); 
      controller.set('actions', actions);       
    });

  },  

  actions: {
    //
    // day record
    //
    cancel: function(day) {
      console.log('>> DaysRoute cancel');  

      if (day.get('isNew')) {
        // Delete daily goals
        deleteDailyGoals(day);
        // Delete current day record
        day.deleteRecord();        
      } else if (day.get('isDirty')) {
        day.rollback();
        // restore the daily goals
        reconnectDailyGoals(this, day);
      }

      this.controllerFor("application").set('isEditing', false);
    },   

    update: function(day) {
      console.log('>> update', day);

      // Changed: Changing date doesn't make sense
      //day.set('date', day.get('dateString')); 
      day.set('a', day.get('a') || '');
      day.set('b', day.get('b') || '');
      day.set('c', day.get('c') || '');      

      var wasNew = day.get('isNew');
      var newGoal = day.get('newGoal');
      var self = this;
      day.save(); 

      this.controllerFor("application").set('isEditing', false);
    },

    delete: function(day) {
      console.log('>> DaysRoute delete'); 
      deleteDay(day);
    },    

    //
    // Goal
    //
    saveGoal: function(day) {
      var title = day.get('newGoal');
      if (title && title.trim()) {
        var store = this.get('store'); 
        createGoal(store, title, day); 
      }      
    },

    updateGoal: function(goal) {
      var isCompleted = goal.get('isCompleted');
      if (isCompleted) {
        goal.set('endDate', currentDay());
      } else {
        goal.set('endDate', forever());
      }
      goal.save();      
    },

    //
    // action activities
    //
    saveActivity: function(action) {
      console.log('>> DaysRoute newAction', action);  
      var store = this.get('store'); 

      // Save the reference before cleaning it up
      var dailyGoal = action.get('dailyGoal');

      action.set('dailyGoal', null);
      action.set('createdAt', moment().format());                

      saveAction(store, dailyGoal, action);   
    }
  }  
});

//
// Day
//

var createToday = function(store, goals) {
  var obj = {
    date: currentDay(),
    a: '',
    b: '',
    c: ''
  };
  console.log('>> new day', obj);
  var day = store.createRecord('day', obj); 
  day.save().then(
    function (answer) {
      // Add daily goals         
      createDailyGoals(store, day, goals, []);
    },
    function (reason) {
      onFailed(reason, model);
    }        
  );    
};

var deleteDay = function(day) {
  // Delete daily goals
  deleteDailyGoals(day);
  // Delete day record
  day.deleteRecord();
  day.save();
};

//
// Goal
//

var createGoal = function(store, title, day) {
  var obj = {
    title: title,
    body: '',
    daily: true,
    startDate: day.get('date'),
    endDate: forever()
  };
  var goal = store.createRecord('goal', obj);
  goal.save().then(
    function (answer) {
      // Create a daily goal
      var dailyGoal = createDailyGoal(store, day, goal);
      // Add first action 
      createFirstAction(store, day, dailyGoal);      
    },
    function (reason) {
      onFailed(reason, goal);
    }
  ); 
};

//
// Daily goal
//

var createDailyGoals = function(store, day, goals, actions) {
  // Loop through all goal records
  for (var i = 0; i < goals.length; i++) {
    var startDate = goals[i].get('startDate'), endDate = goals[i].get('endDate');
    // If the goal range covers today
    if (startDate <= day.get('date') && day.get('date') <= endDate) {
      // Create daily goal
      var dailyGoal = createDailyGoal(store, day, goals[i]);

      // Set actions to their daily goals
      for (var k = 0; k < actions.length; k++) {
        if (actions[k].get('goal').get('id') === goals[i].get('id') 
          && actions[k].get('day').get('id') === day.get('id')) {
          dailyGoal.get('actions').addObject(actions[k]);
        }
      } // for actions 

      var dailyActions = dailyGoal.get('actions').get('content');
      if (day.get('isToday') && dailyActions) {
        createFirstAction(store, day, dailyGoal);
      }     
    }        
  } // for goals  
};

var createDailyGoal = function(store, day, goal) {
  var obj = {
    goal: goal,
    day: day,
    actions: []
  }
  var dailyGoal = store.createRecord('dailyGoal', obj);
  day.get('dailyGoals').addObject(dailyGoal);
  return dailyGoal;
};

var reconnectDailyGoals = function(self, day) {
  self.get('store').findAll('dailyGoal').then(
    function(result){
      var dailyGoals = result.get('content');
      for (var i = 0; i < dailyGoals.length; i++) {
        if (dailyGoals[i].get('day').get('date') === day.get('date')) {
          day.get('dailyGoals').addObject(dailyGoals[i]);
        }
      }
    }
  );
};

var deleteDailyGoals = function(day) {
  if (day.get('dailyGoals')) {
    var dailyGoals = day.get('dailyGoals').get('content');  
    // NOTE: Count backwards when removing items from an array 
    for (var i = dailyGoals.length - 1; i >= 0; i--) {
      // Delete actions    
      var actions = dailyGoals[i].get('actions').get('content');
      for (var j = actions.length - 1; j >= 0; j--) {
        actions[j].deleteRecord();
        actions[j].save();
      }
      // Delete daily goals
      dailyGoals[i].deleteRecord();
    }    
  }
};

//
// Action
//

var createFirstAction = function(store, day, dailyGoal) {
  // Create first action
  var obj = {
    goal: dailyGoal.get('goal'),
    day: dailyGoal.get('day'),
    body: '',
    createdAt: '',
    actionAt: ''           
  }
  var action = store.createRecord('action', obj);
  dailyGoal.get('actions').addObject(action);
  return action;  
};

var createNextAction = function(store, dailyGoal) {
  var obj = {
    goal: dailyGoal.get('goal'),
    day: dailyGoal.get('day'), 
    body: '',
    actionAt: moment().add('hours', 6).format(),
    createdAt: ''  // !!! must be '' or the saveAction() will loop forever   
  }
  var action = store.createRecord('action', obj);  
  dailyGoal.get('actions').addObject(action);

  saveAction(store, dailyGoal, action);   
};

var saveAction = function(store, dailyGoal, action) {
  action.save().then(
    function (answer) {
      // If it is not a scheduled action, schedule the next one
      if (action.get('createdAt')) {
        createNextAction(store, dailyGoal);
      }
    },
    function (reason) {
      onFailed(reason, action);
    }        
  );  
}





/* ***************************************************
 *
 * Components 
 *
 */

 App.DayRecordComponent = Ember.Component.extend({
  init: function() {
    this._super();
    this.set('isEditing', this.get('record').get('isNew'));
  },
  actions: {
    editing: function() {
      this.toggleProperty('isEditing');
    }, 
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
    // Goal
    //
    addingGoal: function() {
      this.toggleProperty('isAddingGoal');
    },
    addGoal: function(day) {
      this.sendAction('newGoalAction', day);

      this.set('newGoal', '');
      this.toggleProperty('isAddingGoal');
    },
    forwardGoal: function(goal) {
      this.sendAction('updateGoalAction', goal);
    },

    //
    // Action activity
    //
    forwardActivity: function(action) {
      this.sendAction('newActivityAction', action);        
    }
  }
});

App.DailyGoalComponent = Ember.Component.extend({
  actions: {
    //
    // Goal
    //
    editingGoal: function() {
      this.toggleProperty('isEditingGoal');
    },
    updateGoal: function(goal) {
      this.sendAction('updateGoalAction', goal);  
      this.toggleProperty('isEditingGoal');
    },

    //
    // Action
    //
    addingActivity: function(action) {
      // If action is scheduled, save it for editing
      if (!action) {
        var dailyGoal = this.get('dailyGoal');
        action = {
          goal: dailyGoal.get('goal'),
          day: dailyGoal.get('day'), 
          body: '',
          createdAt: '',
          actionAt: ''           
        }
      } 
      this.set('clockStarts', new Date());
      this.set('newAction', action);

      this.toggleProperty('isAddingActivity');
    }, 

    addActivity: function(newAction) {
      var duration = moment().diff(this.get('clockStarts'), 'minutes');
      var clockStarts = this.get('clockStarts');

      // Ember Data
      if (!newAction.get('body').trim()){
        if (duration < 1)  {
          newAction.set('body', 'check-in');
        } else {
          newAction.set('body', moment().from(clockStarts, true));
        }
      }
      // Smuggle dailyGoal for later use
      newAction.set('dailyGoal', this.get('dailyGoal'))           
      this.sendAction('newActivityAction', newAction); 

      this.toggleProperty('isAddingActivity');
    },     
  }
});

App.ActionButtonsComponent = Ember.Component.extend({
  actions: {
    updateEdit: function() {
      this.sendAction('updateAction');
    },

    confirmingCancel: function() {
      var record = this.get('record');
      if (record.get('isDirty')) {
        this.toggleProperty('isConfirmingCancel'); 
      } else {
        this.sendAction('cancelAction');
      }
    },
    cancelEdit: function() {      
      this.sendAction('cancelAction');
      this.toggleProperty('isConfirmingCancel');       
    },  
    cancelCancel: function() {
      this.toggleProperty('isConfirmingCancel'); 
    },    

    confirmingDelete: function() {
      this.toggleProperty('isConfirmingDelete'); 
    },
    delete: function() {
      this.sendAction('deleteAction');      
      this.toggleProperty('isConfirmingDelete');
    },
    cancelDelete: function() {
      this.toggleProperty('isConfirmingDelete'); 
    },
  }
});


/* ***************************************************
 *
 * Controllers 
 *
 */

App.ApplicationController = Ember.Controller.extend({
  isEditing: false,
});

App.DaysController = Ember.ArrayController.extend({
  // needs: 'application',
  // isEditing: Ember.computed.alias('controllers.application.isEditing'),

  sortProperties: ['date'],
  sortAscending: false
});

/* ***************************************************
 *
 * Models 
 *
 */

 App.Day = DS.Model.extend({
  date: DS.attr(),
  /*
  , year: function() {
        return this.get('date').getFullYear();
  }.property('date')
  , month: function() {
        return this.get('date').getMonth()+1;
  }.property('date')
  , day: function() {
        return this.get('date').getDate();
  }.property('date')
  , daysSince1970: function() {
    return Math.floor(this.get('date').getTime() / (24*60*60*1000));
  }.property('date')    
  */
  // dateString is a proxy for safe editing
  dateString: function() {
    return this.get('date');
  }.property('date'),
  isToday: function() {
    return this.get('date') === currentDay();
  }.property('date'), 
  dateDisplay: function() {
    return this.get('dateString') && moment(this.get('dateString')).isValid() ? 
      moment(this.get('dateString')).format('MMMM D, YYYY') : '';
  }.property('dateString'),
  dayOfWeek: function() {
    return this.get('dateString') && moment(this.get('dateString')).isValid() ? 
      moment(this.get('dateString')).format('dddd') : '';
  }.property('dateString'),
  a: DS.attr(),
  b: DS.attr(),
  c: DS.attr(),
  dailyGoals: DS.hasMany('dailyGoal')
});

// Save to archive
App.Goal = DS.Model.extend({
  title: DS.attr(),
  body: DS.attr(),
  daily: DS.attr(),
  startDate: DS.attr(),
  endDate: DS.attr(),
  isCompleted: function() {
    return this.get('endDate') <= currentDay();
  }.property('endDate'),  
});

// Generated from archive
App.DailyGoal = DS.Model.extend({
  goal: DS.belongsTo('goal'),
  day: DS.belongsTo('day'), 
  actions: DS.hasMany('action')
});

App.Action = DS.Model.extend({
  goal: DS.belongsTo('goal'),
  day: DS.belongsTo('day'), 
  body: DS.attr(),
  actionAt: DS.attr(),
  createdAt: DS.attr()
});

App.Test = DS.Model.extend({
  createdAt: DS.attr()
});
